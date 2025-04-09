import { NextFunction, Request, Response } from "express";
import { wishListModel } from "../../../DB/models/wishlist.model";
import { CustomError } from "../../../utils/errorHandling";
import { cartModel } from "../../../DB/models/cart.model";
import { Iuser } from "../../../DB/interfaces/user.interface";
import S3Instance from "../../../utils/aws.sdk.s3";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";

export const wishList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
  const userId = req.user?._id;

  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({
    userId: user._id,
    courseId,
  });

  if (isCourseExist) {
    return next(new CustomError("Course already exists", 400));
  }

  const wishlistItem = await wishListModel.create({
    userId,
    courseId,
    isWishlistAdded: true,
  });

  await userModel.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: courseId } },
    { new: true }
  );

  if (!wishlistItem) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res.status(200).json({
    message: "Course added successfully in wishlist",
    statusCode: 200,
    success: true,
    data: {
      wishlistItem,
    },
  });
};

export const removeCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const userId = req.user?._id;
  const { courseId } = req.params;

  if (!user) throw new Error("User is not found!");

  const isCourseExist = await wishListModel.find({
    userId: user._id,
    courseId,
  });
  if (!isCourseExist) {
    return next(new CustomError("Course is not found", 400));
  }

  const deleteCourse = await wishListModel.findOneAndDelete({
    userId: user._id,
    courseId,
  });

  if (!deleteCourse) {
    return next(new CustomError("course id is not found", 400));
  }

  await userModel.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: courseId } },
    { new: true }
  );

  res.status(200).json({
    message: "Course deleted successfully",
    statusCode: 200,
    success: true,
    data: null,
  });
};

export const getWishListCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new CustomError("Authentication required", 401);
  }

  const wishlistItems = await wishListModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (!wishlistItems.length) {
    return res.status(200).json({
      message: "No courses in wishlist",
      statusCode: 200,
      success: true,
      data: [],
    });
  }

  const courseIds = wishlistItems.map((item) => item.courseId);

  const courses = await courseModel
    .aggregate([
      { $match: { _id: { $in: courseIds } } },
      {
        $lookup: {
          from: "users",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructor",
          pipeline: [
            {
              $project: { firstName: 1, lastName: 1, avatar: 1 },
            },
          ],
        },
      },
      { $unwind: "$instructor" },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [
            {
              $project: { title: 1, thumbnail: 1 },
            },
          ],
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          title: 1,
          description: 1,
          thumbnail: 1,
          price: 1,
          duration: 1,
          instructor: 1,
          category: 1,
          access_type: 1,
          enrollments: 1,
          originalPrice: 1,
        },
      },
    ])
    .exec();

  const wishlistCourses = await Promise.all(
    courses.map(async (course) => {
      const wishlistItem = wishlistItems.find(
        (item) => item.courseId.toString() === course._id.toString()
      );

      let thumbnailUrl = "";
      try {
        if (course.thumbnail) {
          thumbnailUrl = await new S3Instance().getFile(course.thumbnail);
        }
      } catch (error) {
        console.error("Failed to get thumbnail URL:", error);
      }

      return {
        ...wishlistItem,
        courseId: {
          ...course,
          url: thumbnailUrl,
          instructorId: course.instructor,
          categoryId: course.category,
        },
      };
    })
  );

  res.status(200).json({
    message: "Wishlist courses fetched",
    statusCode: 200,
    success: true,
    data: wishlistCourses,
  });
};

export const addToCartIcon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
  const { isCartAdded } = req.body;
  console.log(isCartAdded);

  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({
    userId: user._id,
    courseId,
  });

  // if (isCourseExist) {
  //   return next(new CustomError("Course already exists", 400));
  // }

  const updateCartIcon = await wishListModel.findOneAndUpdate(
    { userId: user._id, courseId },
    { isCartAdded: isCartAdded },
    { new: true }
  );

  if (!updateCartIcon) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res.status(200).json({
    message: "cart icon change successfully",
    statusCode: 200,
    success: true,
    data: updateCartIcon,
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

  const isCourseExist = await wishListModel.find({
    userId: user._id,
    courseId,
  });
  if (!isCourseExist) {
    return next(new CustomError("Course is not found", 400));
  }

  const getCourse = await wishListModel.findOne({ userId: user._id, courseId });

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

export const getCourseAddedCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const { courseId } = req.params;

  if (!user) throw new Error("User is not found!");

  const isCourseExist = await wishListModel.find({
    userId: user._id,
    courseId,
  });
  if (!isCourseExist) {
    return next(new CustomError("Course is not found", 400));
  }

  const getCourse = await cartModel.findOneAndUpdate(
    { userId: user._id, courseId },
    { isCartAdded: true },
    { new: true }
  );

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

export const wishlistCheckCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;

  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({
    userId: user._id,
    courseId,
  });

  if (!isCourseExist) {
    return new CustomError("Course Not Found in Wishlist", 400);
  }

  res.status(200).json({
    message: "Course founded in wishlist",
    statusCode: 200,
    success: true,
    data: { isWishlistAdded: !!isCourseExist, id: isCourseExist._id },
  });
};
