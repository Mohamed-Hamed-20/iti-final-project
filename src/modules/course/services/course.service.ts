import { PipelineStage } from "mongoose";
import { Request, Response, NextFunction } from "express";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import { paginate } from "../../../utils/pagination";
import { courseKey, uploadFileToQueue } from "./courses.helper";
import S3Instance from "../../../utils/aws.sdk.s3";
import ApiPipeline from "../../../utils/apiFeacture";
import { forEach } from "lodash";

export const addCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, description, price, access_type, categoryId, learningPoints } =
    req.body;
  const instructorId = req.user?._id;

  if (!req.file) {
    return next(new CustomError("Missing required fields", 400));
  }

  const newCourse = new courseModel({
    title,
    description,
    price,
    access_type,
    instructorId,
    categoryId,
    learningPoints,
  });

  const folder = await courseKey(
    newCourse._id,
    newCourse.title,
    req.file.originalname
  );

  if (!folder) {
    return next(new CustomError("Failed to add course", 500));
  }

  req.file.folder = folder;
  newCourse.thumbnail = req.file.folder;

  const [uploadImgae, savedCourse] = await Promise.all([
    new S3Instance().uploadLargeFile(req.file),
    newCourse.save(),
  ]);

  if (uploadImgae instanceof Error) {
    await courseModel.deleteOne({ _id: newCourse._id });
    return next(new CustomError("Error Uploading Image Server Error!", 500));
  }

  return res.status(201).json({
    message: "Course added successfully",
    statusCode: 201,
    success: true,
    course: savedCourse,
  });
};

const allowSearchFields = [
  "title",
  "description",
  "instructor.firstName",
  "instructor.lastName",
  "category.title",
];

const defaultFields = [
  "title",
  "description",
  "price",
  "thumbnail",
  "rating",
  "totalSections",
  "totalVideos",
  "totalDuration",
  "purchaseCount",
  "learningPoints",
  "instructor",
  "categoryId",
];

export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, size, select, sort, search } = req.query;

    const pipeline = new ApiPipeline()
      .lookUp(
        {
          from: "users",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructor",
          isArray: false,
        },
        {
          firstName: 1,
          lastName: 1,
          avatar: 1,
        }
      )
      .lookUp(
        {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          isArray: false,
        },
        {
          title: 1,
        }
      )
      .match({
        fields: allowSearchFields,
        search: search?.toString() || "",
        op: "$or",
      })
      .sort(sort?.toString() || "")
      .paginate(Number(page) || 1, Number(size) || 10)
      .projection({
        allowFields: defaultFields,
        defaultFields: defaultFields,
        select: select?.toString() || "",
      })
      .build();

    const courses = await courseModel.aggregate(pipeline).exec();

    await Promise.all(
      courses.map(async (course) => {
        if (course?.thumbnail) {
          const url = await new S3Instance().getFile(course.thumbnail);
          course.url = url;
        }
      })
    );

    return res.status(200).json({
      message: "Courses fetched successfully",
      statusCode: 200,
      success: true,
      courses,
    });
  } catch (error) {
    return next(
      new CustomError(
        `Failed to fetch courses: ${(error as Error).message}`,
        500
      )
    );
  }
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const course = await courseModel
    .findById(id)
    .populate("instructorId", "firstName lastName avatar")
    .populate("categoryId", "title thumbnail")
    .lean();

  if (!course) {
    return next(new CustomError("Course not found", 404));
  }
  course.url = await new S3Instance().getFile(course.thumbnail);

  return res.status(200).json({
    message: "Course fetched successfully",
    statusCode: 200,
    success: true,
    course,
  });
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updatedCourse = await courseModel.findByIdAndUpdate(id, req.body, {
      new: true,
      lean: true,
    });

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
    return next(
      new CustomError(
        `Failed to update course: ${(error as Error).message}`,
        500
      )
    );
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const searchCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { collectionName, searchFilters } = req.body;

    if (!collectionName || !searchFilters) {
      return next(
        new CustomError(
          "Collection name and valid search filters are required",
          400
        )
      );
    }
    if (collectionName === "courses") {
      const searchFilters2 = "^" + searchFilters;
      const courses = await courseModel
        .find({
          title: { $regex: searchFilters2, $options: "i" },
        })
        .populate("instructorId", "firstName lastName")
        .populate("categoryId", "title");
      res.status(200).json({ status: "success", data: courses });
    } else if (collectionName === "instructors") {
      const searchFilters2 = "^" + searchFilters;
      const instructors = await userModel
        .find({
          firstName: { $regex: searchFilters2, $options: "i" },
          // $or: [
          //   { firstName: { $regex: searchFilters, $options: "i" } },
          //   { lastName: { $regex: searchFilters, $options: "i" } }
          // ]
        })
        .select("-password -email")
        .populate("courses")
        .lean();

      res.status(200).json({ status: "success", data: instructors });
    } else {
      return next(new CustomError("Invalid collection name", 400));
    }
  } catch (error) {
    console.error("Search Error:", error);
    return next(
      new CustomError(`Failed to search: ${(error as Error).message}`, 500)
    );
  }
};
