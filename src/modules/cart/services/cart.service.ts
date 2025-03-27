import { NextFunction, Request, Response } from "express";
import { cartModel } from "../../../DB/models/cart.model";
import { CustomError } from "../../../utils/errorHandling";
import { populate } from "dotenv";
import courseModel from "../../../DB/models/courses.model";

interface Category {
  _id: string;
  title: string;
}

interface Course {
  _id: string;
  title: string;
  categoryId?: Category | null; // categoryId might be null if not populated
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

  const courseAdded = new cartModel({ userId: user._id, courseId });
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
): Promise<void | any> => {
  const { user } = req;

  if (!user) throw new Error("User is not found!");

  const allCourses = await cartModel.find({ userId: user._id }).populate({
    path: "courseId",
    populate: [
      {
        path: "instructorId",
        select: "firstName lastName",
      },
      {
        path: "categoryId",
        select: "title",
      },
    ],
  });

  if (!allCourses) {
    return next(new CustomError("No Courses founded in your cart", 400));
  }

  res.status(200).json({
    message: "Fetch cart courses",
    statusCode: 200,
    success: true,
    data: allCourses,
  });
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
): Promise<void | any> => {
  const { user } = req;
  let { category } = req.query;


  if (!category) {
    category = [];
  } else if (!Array.isArray(category)) {
    category = [category as string];
  }


  if (!user) throw new Error("User is not found!");

  const allCourses = await courseModel.aggregate([
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
      $match: {
        "category.title": { $in: category }, 
      },
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
        description: 0,
        "category._id": 0, 
        "instructor._id": 0,
      },
    },
  ]);
  
  
  

  if (!allCourses) {
    return next(new CustomError("No Courses founded in this category", 400));
  }

  res.status(200).json({
    message: "Fetch courses based on categories",
    statusCode: 200,
    success: true,
    data: allCourses,
  });
};
