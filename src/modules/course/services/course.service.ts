import mongoose, { PipelineStage, Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import { paginate } from "../../../utils/pagination";
import { courseKey, uploadFileToQueue } from "./courses.helper";
import S3Instance from "../../../utils/aws.sdk.s3";
import ApiPipeline from "../../../utils/apiFeacture";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import categoryModel from "../../../DB/models/category.model";

export const addCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    title,
    description,
    price,
    access_type,
    categoryId,
    learningPoints,
    subTitle,
    requirements,
    level,
  } = req.body;
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
    subTitle,
    requirements,
    level,
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

  const [uploadImage, savedCourse] = await Promise.all([
    new S3Instance().uploadLargeFile(req.file),
    newCourse.save(),
  ]);

  if (uploadImage instanceof Error) {
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
  "subTitle",
  "requirements",
  "instructor",
  "category",
  "access_type",
  "level",
  "createdAt",
  "updatedAt",
];

// get all courses from
export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    .paginate(Number(page) || 1, Number(size) || 100)
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
};

// get all courses from
export const getAllCoursesForInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { page, size, select, sort, search } = req.query;
  const { access_type } = req.query;
  console.log({ userId: req.user?._id });

  const pipeline = new ApiPipeline()
    .searchOnString("access_type", access_type as string)
    .matchId({
      Id: req.user?._id as Types.ObjectId,
      field: "instructorId",
    })
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
};

// get single course
export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const pipeline = new ApiPipeline()
    .matchId({ Id: id as any, field: "_id" })
    .lookUp(
      {
        localField: "instructorId",
        from: "users",
        foreignField: "_id",
        as: "instructor",
        isArray: false,
      },
      {
        firstName: 1,
        lastName: 1,
        age: 1,
        phone: 1,
        isOnline: 1,
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
        thumbnail: 1,
      }
    )
    .lookUp(
      {
        localField: "_id",
        from: "sections",
        foreignField: "courseId",
        as: "sections",
        isArray: true,
      },
      {
        _id: 1,
        title: 1,
        order: 1,
      }
    )
    .lookUp(
      {
        localField: "sections._id",
        from: "videos",
        foreignField: "sectionId",
        as: "videos",
        isArray: true,
      },
      {
        _id: 1,
        sectionId: 1,
        title: 1,
        order: 1,
        video_key: 1,
        thumbnail_key: 1,
      }
    )
    .addStage({
      $unwind: { path: "$sections", preserveNullAndEmptyArrays: true },
    })
    .addStage({
      $lookup: {
        from: "videos",
        localField: "sections._id",
        foreignField: "sectionId",
        as: "sections.videos",
      },
    })
    .addStage({
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        description: { $first: "$description" },
        price: { $first: "$price" },
        thumbnail: { $first: "$thumbnail" },
        rating: { $first: "$rating" },
        totalSections: { $first: "$totalSections" },
        totalVideos: { $first: "$totalVideos" },
        totalDuration: { $first: "$totalDuration" },
        purchaseCount: { $first: "$purchaseCount" },
        learningPoints: { $first: "$learningPoints" },
        subTitle: { $first: "$subTitle" },
        requirements: { $first: "$requirements" },
        instructor: { $first: "$instructor" },
        category: { $first: "$category" },
        access_type: { $first: "$access_type" },
        level: { $first: "$level" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        sections: {
          $push: {
            _id: "$sections._id",
            title: "$sections.title",
            order: "$sections.order",
            videos: "$sections.videos",
          },
        },
      },
    })
    .projection({
      allowFields: defaultFields,
      defaultFields: defaultFields,
      select: undefined,
    })
    .build();

  const courseArray = await courseModel.aggregate(pipeline);

  if (!courseArray.length) {
    return next(new CustomError("Course not found", 404));
  }

  let course = courseArray[0];

  if (course.thumbnail) {
    course.url = await new S3Instance().getFile(course.thumbnail);
  }

  return res.status(200).json({
    message: "Course fetched successfully",
    statusCode: 200,
    success: true,
    course,
  });
};

// update course
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const {
    title,
    description,
    price,
    learningPoints,
    access_type,
    categoryId,
    level,
    subTitle,
    requirements,
  } = req.body;

  const course = await courseModel.findById(id).lean();
  if (!course) {
    return next(new CustomError("Course not found", 404));
  }

  if (String(course.instructorId) !== String(req.user?._id)) {
    return next(new CustomError("Not allowed to modify this course", 403));
  }

  const courseUpdate: any = {};

  if (title !== undefined) courseUpdate.title = title;
  if (description !== undefined) courseUpdate.description = description;
  if (price !== undefined) courseUpdate.price = price;
  if (access_type !== undefined) courseUpdate.access_type = access_type;
  if (learningPoints !== undefined)
    courseUpdate.learningPoints = learningPoints;
  if (level !== undefined) courseUpdate.level = level;
  if (subTitle !== undefined) courseUpdate.subTitle = subTitle;
  if (requirements !== undefined) courseUpdate.requirements = requirements;

  if (categoryId) {
    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return next(new CustomError("Category not found", 404));
    }
    courseUpdate.categoryId = category._id;
  }

  const updated = await courseModel.findByIdAndUpdate(
    id,
    { $set: courseUpdate },
    { new: true, lean: true }
  );

  return res.status(200).json({
    message: "Course updated successfully",
    statusCode: 200,
    success: true,
    course: updated,
  });
};

// update image for course
export const updatecourseImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!req.file) {
    return next(new CustomError("Course image not provided successfully", 400));
  }

  let course = await courseModel.findById(id).lean().select("title thumbnail");
  if (!course) {
    return next(new CustomError("Course not found", 404));
  }

  const sanitizedTitle = course.title.replace(/\s+/g, "-");
  const sanitizedFileName = req.file.originalname.replace(/\s+/g, "-");
  const folder = `/courses/${course._id}/${sanitizedTitle}--${sanitizedFileName}`;

  req.file.folder = folder;

  if (folder !== course.thumbnail) {
    console.log("hellow mother");

    course = await courseModel.findByIdAndUpdate(
      id,
      { $set: { thumbnail: folder } },
      { new: true, lean: true }
    );
  }

  const s3 = new S3Instance();
  const updateFile = await s3.uploadLargeFile(req.file);

  if (!updateFile) {
    return next(new CustomError("Missing Server Error", 400));
  }

  return res.status(200).json({
    message: "Image updated successfully",
    statusCode: 200,
    success: true,
    updateFile,
    course,
  });
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [Course, sections, videos] = await Promise.all([
      courseModel.findById(id).lean().session(session),
      sectionModel.find({ courseId: id }).session(session),
      videoModel.find({ courseId: id }).session(session),
    ]);

    if (!Course) {
      await session.abortTransaction();
      return next(new CustomError("Course not found", 404));
    }

    // add all keys to delete
    let keys = [];
    keys.push(Course.thumbnail);
    keys.push(
      videos.map((video) => {
        return video.video_key;
      })
    );

    const [deleteCourse, filesDelete] = await Promise.all([
      courseModel.deleteOne({ _id: id }).session(session),
      new S3Instance().deleteFiles(keys as Array<string>),
    ]);

    if (
      deleteCourse.deletedCount < 0 ||
      !filesDelete ||
      filesDelete.length <= 0
    ) {
      await session.abortTransaction();
      return next(
        new CustomError("Error when delete course Server Error", 500)
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error as any);
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
