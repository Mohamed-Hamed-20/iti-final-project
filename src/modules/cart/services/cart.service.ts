import { NextFunction, Request, Response } from "express";
import { cartModel } from "../../../DB/models/cart.model";
import { CustomError } from "../../../utils/errorHandling";
import courseModel from "../../../DB/models/courses.model";
import S3Instance from "../../../utils/aws.sdk.s3";
import { Iuser } from "../../../DB/interfaces/user.interface";

interface Category {
  _id: string;
  title: string;
}

interface Course {
  _id: string;
  title: string;
  categoryId?: Category | null;
}

export const cart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;

  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await cartModel.findOne({ userId: user._id, courseId });

  if (isCourseExist) {
    return next(new CustomError("Course already exists", 400));
  }

  const courseAdded = new cartModel({
    userId: user._id,
    courseId,
    isCartAdded: true,
  });
  const courseSaved = await courseAdded.save();

  if (!courseSaved) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res.status(200).json({
    message: "Course added successfully in cart",
    statusCode: 200,
    success: true,
  });
};

export const getCartCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as { user: Iuser };

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  try {
    const cartItems = await cartModel.find({ userId: user._id }).lean();

    if (!cartItems || cartItems.length === 0) {
      return res.status(200).json({
        message: "No courses found in your cart",
        statusCode: 200,
        success: true,
        data: [],
      });
    }

    const courseIds = cartItems.map((item) => item.courseId);

    const pipeline = [
      {
        $match: {
          _id: { $in: courseIds },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructorId",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$instructorId",
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
          pipeline: [
            {
              $project: {
                title: 1,
                thumbnail: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$categoryId",
      },
    ];

    // Get courses with populated data
    const courses = await courseModel.aggregate(pipeline).exec();

    // Add URLs to courses and merge with cart info
    const cartCourses = await Promise.all(
      courses.map(async (course) => {
        const cartItem = cartItems.find(
          (item) => item.courseId.toString() === course._id.toString()
        );

        let url = "";
        if (course?.thumbnail) {
          url = await new S3Instance().getFile(course.thumbnail);
        }

        return {
          ...cartItem,
          courseId: {
            ...course,
            url,
            instructorId: course.instructorId,
            categoryId: course.categoryId,
          },
        };
      })
    );

    return res.status(200).json({
      message: "Cart courses fetched successfully",
      statusCode: 200,
      success: true,
      data: cartCourses,
    });
  } catch (error) {
    next(new CustomError("Failed to fetch cart courses", 500));
  }
};

export const removeCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const { courseId } = req.params;

  if (!user) throw new Error("User is not found!");

  const isCourseExist = await cartModel.find({ userId: user._id, courseId });
  if (!isCourseExist) {
    return next(new CustomError("Course is not found", 400));
  }

  const deleteCourse = await cartModel.findOneAndDelete({
    userId: user._id,
    courseId,
  });

  if (!deleteCourse) {
    return next(new CustomError("course id is not found", 400));
  }

  res.status(200).json({
    message: "Course deleted successfully",
    statusCode: 200,
    success: true,
  });
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const { courseId } = req.params;

  if (!user) throw new Error("User is not found!");

  const isCourseExist = await cartModel.find({ userId: user._id, courseId });
  if (!isCourseExist) {
    return next(new CustomError("Course is not found", 400));
  }

  const getCourse = await cartModel.findOne({ userId: user._id, courseId });

  if (!getCourse) {
    return next(new CustomError("course id is not found", 400));
  }

  res.status(200).json({
    message: "Course deleted successfully",
    statusCode: 200,
    success: true,
    data: getCourse,
  });
};

export const getCoursesByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { user } = req;
  const { category } = req.query;

  if (!user) {
    next(new CustomError("User not found", 404));
    return;
  }

    const categoryArray: string[] = category
      ? typeof category === "string"
        ? category.split(",")
        : []
      : [];

    const pipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $match:
          categoryArray.length > 0
            ? { "category.title": { $in: categoryArray }, status: "approved" } 
            : { status: "approved" }, 
      },
      {
        $lookup: {
          from: "users",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructor",
        },
      },
      {
        $unwind: "$instructor",
      },
      {
        $project: {
          title: 1,
          price: 1,
          thumbnail: 1,
          access_type: 1,
          rating: 1,
          totalSections: 1,
          totalVideos: 1,
          totalDuration: 1,
          purchaseCount: 1,
          createdAt: 1,
          updatedAt: 1,
          "category.title": 1,
          "category.thumbnail": 1,
          "instructor._id": 1,  
          "instructor.firstName": 1,
          "instructor.lastName": 1,
          "instructor.avatar": 1,
        },
      },
    ];

    const courses = await courseModel.aggregate(pipeline).exec();

    const coursesWithUrls = await Promise.all(
      courses.map(async (course) => {
        let url = "";
        if (course.thumbnail) {
          url = await new S3Instance().getFile(course.thumbnail);
        }
        if (course.instructor) {
          course.instructor.url = await new S3Instance().getFile(
            course.instructor.avatar
          );
        }
        return {
          ...course,
          url,
          duration: course.totalDuration
          ? course.totalDuration < 3600
          ? `${Math.floor(course.totalDuration / 60)}m`
          : `${Math.floor(course.totalDuration / 3600)}h ${Math.floor((course.totalDuration % 3600) / 60)}m`
            : "0m",
          enrollments: course.purchaseCount || 0,
        };
      })
    );

    if (coursesWithUrls.length === 0) {
      res.status(200).json({
        message: "No courses found in this category",
        statusCode: 200,
        success: true,
        data: [],
      });
      return;
    }

    res.status(200).json({
      message: "Courses fetched successfully",
      statusCode: 200,
      success: true,
      data: coursesWithUrls,
    });
};
