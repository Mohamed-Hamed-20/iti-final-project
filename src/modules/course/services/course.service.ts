import { NextFunction, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import categoryModel from "../../../DB/models/category.model";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import ApiPipeline from "../../../utils/apiFeacture";
import S3Instance from "../../../utils/aws.sdk.s3";
import { CustomError } from "../../../utils/errorHandling";
import { createNotification } from "../../notification/notification.controller";
import { courseKey } from "./courses.helper";

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

  const folder = await courseKey(newCourse._id, newCourse.title);

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

  res.status(201).json({
    message: "Course added successfully",
    statusCode: 201,
    success: true,
    course: savedCourse,
  });

  // Create notification after course creation
  await createNotification(
    req.user?._id.toString()!,
    savedCourse._id.toString()
  );
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

  const [total, courses] = await Promise.all([
    courseModel.countDocuments().lean(),
    courseModel.aggregate(pipeline).exec(),
  ]);

  const updatePromises = courses.map(async (course) => {
    if (course?.thumbnail) {
      return {
        ...course,
        url: await new S3Instance().getFile(course.thumbnail),
      };
    }
    return course;
  });

  const updatedCourses = await Promise.all(updatePromises);

  return res.status(200).json({
    message: "Courses fetched successfully",
    statusCode: 200,
    totalCourses: total,
    totalPages: Math.ceil(total / Number(size || 23)),
    success: true,
    courses: updatedCourses,
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

  const [total, courses] = await Promise.all([
    courseModel.countDocuments().lean(),
    courseModel.aggregate(pipeline).exec(),
  ]);

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
    totalCourses: total,
    totalPages: Math.ceil(total / Number(size || 23)),
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
        publicView: 1,
        status: 1,
        process: 1,
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
      allowFields: [...defaultFields, "sections", "videos"],
      defaultFields: [...defaultFields, "sections", "videos"],
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
  try {
   
    const course = await courseModel.findById(req.params.id);
    if (!course) {
      return next(new CustomError("Course not found", 404));
    }

    const courseUpdate: any = {};

 
    if (req.file) {
      const newTitle = courseUpdate.title ?? course.title;
      const folder = await courseKey(course._id, newTitle);
      req.file.folder = folder;

      if (folder !== course.thumbnail) {
        courseUpdate.thumbnail = folder;
      }

      const s3 = new S3Instance();
      const updateFile = await s3.uploadLargeFile(req.file);

      if (!updateFile) {
        return next(new CustomError("Failed to upload image", 400));
      }
    }

    if (course.thumbnail) {
      course.url = await new S3Instance().getFile(course.thumbnail);
    }

    const updateData = {
      ...req.body,
      ...courseUpdate
    };
    const updated = await courseModel.findByIdAndUpdate(
      req.params.id,
      updateData, 
      { new: true, lean: true }  
    );

    return res.status(200).json({
      message: "Course updated successfully",
      statusCode: 200,
      success: true,
      course: updated,
    });
  } catch (error) {
    next(error);
  }
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

    if (!collectionName || !searchFilters || typeof searchFilters !== 'string') {
      return next(new CustomError("Valid collection name and search term are required", 400));
    }

    const searchRegex = new RegExp(searchFilters, "i"); 

    if (collectionName === "courses") {
      type CourseWithPopulatedFields = {
        _id: any;
        title: string;
        thumbnail?: string;
        instructorId: {
          firstName: string;
          lastName: string;
          avatar?: string;
        };
        categoryId: {
          title: string;
          thumbnail?: string;
        };
        [key: string]: any;
      };

      const courses = await courseModel
        .find({
          $or: [
            { title: searchRegex },
            { description: searchRegex }
          ]
        })
        .populate<Pick<CourseWithPopulatedFields, 'instructorId' | 'categoryId'>>([
          { path: 'instructorId', select: 'firstName lastName avatar' },
          { path: 'categoryId', select: 'title thumbnail' }
        ])
        .limit(10) 
        .lean();

      const processedCourses = await Promise.all(
        courses.map(async (course) => {
          const thumbnailUrl = course.thumbnail 
            ? await new S3Instance().getFile(course.thumbnail)
            : undefined;

          return {
            ...course,
            url: thumbnailUrl,
            instructor: {
              firstName: course.instructorId?.firstName || '',
              lastName: course.instructorId?.lastName || '',
              avatar: course.instructorId?.avatar || ''
            },
            category: {
              title: course.categoryId?.title || '',
              thumbnail: course.categoryId?.thumbnail || ''
            }
          };
        })
      );

      return res.status(200).json({ 
        status: "success", 
        data: processedCourses 
      });

    } else if (collectionName === "instructors") {
      type InstructorWithCourses = {
        _id: any;
        firstName: string;
        lastName: string;
        avatar?: string;
        role: string;
        courses: Array<{
          _id: any;
          title: string;
          thumbnail?: string;
          price: number;
          rating: number;
        }>;
      };

      const instructors = await userModel
        .find({
          role: "instructor",
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex } 
          ]
        })
        .select("-password -email -refreshToken -__v")
        .populate<Pick<InstructorWithCourses, 'courses'>>({
          path: "courses",
          select: "title thumbnail price rating",
          options: { limit: 3 }
        })
        .limit(10)
        .lean();

      const processedInstructors = await Promise.all(
        instructors.map(async (instructor) => {
          const avatarUrl = instructor.avatar && !instructor.avatar.startsWith('http')
            ? await new S3Instance().getFile(instructor.avatar)
            : instructor.avatar;

          const processedCourses = await Promise.all(
            instructor.courses?.map(async (course) => ({
              ...course,
              url: course.thumbnail ? await new S3Instance().getFile(course.thumbnail) : undefined
            })) || []
          );

          return {
            ...instructor,
            avatar: avatarUrl,
            courses: processedCourses
          };
        })
      );

      return res.status(200).json({ 
        status: "success", 
        data: processedInstructors 
      });

    } else {
      return next(new CustomError("Invalid collection name. Use 'courses' or 'instructors'", 400));
    }
  } catch (error) {
    console.error("Search Error:", error);
    return next(
      new CustomError("Failed to perform search. Please try again later.", 500)
    );
  }
};


export const requestCourseVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const { courseId } = req.params;
    const userId = req.user?._id;

    const course = await courseModel.findOne({
      _id: courseId,
      instructorId: userId
    });

    if (!course) {
      return next(new CustomError("Course not found or unauthorized", 404));
    }

    if (course.status !== "none") {
      return next(new CustomError(
        `Course verification is already ${course.status}`,
        400
      ));
    }

    // Check if course has at least one section and one video
    const sections = await sectionModel.find({ courseId });
    if (sections.length === 0) {
      return next(new CustomError(
        "Course must have at least one section to request verification",
        400
      ));
    }

    // Check videos for each section
    for (const section of sections) {
      const videos = await videoModel.find({ sectionId: section._id });
      if (videos.length === 0) {
        return next(new CustomError(
          `Section "${section.title}" must have at least one video`,
          400
        ));
      }
    }

    const [updatedCourse] = await Promise.all([
      courseModel.findByIdAndUpdate(
        courseId,
        { status: "pending" },
        { new: true }
      ),
      sectionModel.updateMany(
        { courseId },
        { status: "pending" }
      ),
      videoModel.updateMany(
        { courseId },
        { status: "pending" }
      )
    ]);


    res.status(200).json({
      success: true,
      message: "Verification request submitted successfully",
      course: updatedCourse
    });

};