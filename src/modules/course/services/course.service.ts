import { Request, Response, NextFunction } from "express";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import { Model } from "mongoose";


export const addCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, price, access_type, categoryId } = req.body;
    const instructorId = req.user?._id; 

    if (!title || !price || !access_type || !categoryId || !req.file) {
      return next(new CustomError("Missing required fields", 400));
    }

    const thumbnail = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newCourse = new courseModel({
      title,
      description,
      price,
      access_type,
      instructorId,
      categoryId,
      thumbnail
    });

    const savedCourse = await newCourse.save();

    return res.status(201).json({
      message: "Course added successfully",
      statusCode: 201,
      success: true,
      course: savedCourse,
    });
  } catch (error) {
    return next(new CustomError(`Failed to add course: ${(error as Error).message}`, 500));
  }
};

export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const courses = await courseModel.find().populate("instructorId", "firstName lastName avatar").lean();

    return res.status(200).json({
      message: "Courses fetched successfully",
      statusCode: 200,
      success: true,
      courses,
    });
  } catch (error) {
    return next(new CustomError(`Failed to fetch courses: ${(error as Error).message}`, 500));
  }
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const course = await courseModel.findById(id).populate("instructorId", "firstName lastName avatar").lean();

    if (!course) {
      return next(new CustomError("Course not found", 404));
    }

    return res.status(200).json({
      message: "Course fetched successfully",
      statusCode: 200,
      success: true,
      course,
    });
  } catch (error) {
    return next(new CustomError(`Failed to fetch course: ${(error as Error).message}`, 500));
  }
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updatedCourse = await courseModel.findByIdAndUpdate(id, req.body, { new: true, lean: true });

    if (!updatedCourse) {
      return next(new CustomError("Course not found", 404));
    }

    return res.status(200).json({
      message: "Course updated successfully",
      statusCode: 200,
      success: true,
      course: updatedCourse,
    });
  } catch (error) {
    return next(new CustomError(`Failed to update course: ${(error as Error).message}`, 500));
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const deletedCourse = await courseModel.findByIdAndDelete(id).lean();

    if (!deletedCourse) {
      return next(new CustomError("Course not found", 404));
    }

    return res.status(200).json({
      message: "Course deleted successfully",
      statusCode: 200,
      success: true,
    });
  } catch (error) {
    return next(new CustomError(`Failed to delete course: ${(error as Error).message}`, 500));
  }
};

export const searchCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { collectionName, searchFilters } = req.body;

    if (!collectionName || !searchFilters) {
      return next(new CustomError("Collection name and valid search filters are required", 400));
    }

    let model: Model<any>
    let searchQuery: Record<string, any> = {};

    if (collectionName === "courses") {
      const courses = await courseModel.find({
        $or: [
          { title: { $regex: searchFilters, $options: "i" } },
          { description: { $regex: searchFilters, $options: "i" } }
        ]
      }).populate("instructorId")
      res.status(200).json({status: "success" , data: courses})
    } else if (collectionName === "instructors") {
      const searchFilters2 = "^" + searchFilters;
      const courses = await userModel.find({
        firstName: { $regex: searchFilters2, $options: "i" }
        // $or: [
        //   { firstName: { $regex: searchFilters, $options: "i" } },
        //   { lastName: { $regex: searchFilters, $options: "i" } }
        // ]
      })
      res.status(200).json({status: "success" , data: courses})
    } else {
      return next(new CustomError("Invalid collection name", 400));
    }

  } catch (error) {
    console.error("Search Error:", error);
    return next(new CustomError(`Failed to search: ${(error as Error).message}`, 500));
  }
};
