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
import { sanatizeUser } from "../../../utils/sanatize.data";
import { Iuser, Roles } from "../../../DB/interfaces/user.interface";
import { CACHE_TTL } from "../../../config/env";
import { CacheService } from "../../../utils/redis.services";
import redis from "../../../utils/redis";
import { isAuth } from "../../../middleware/auth";
import EnrollmentModel from "../../../DB/models/enrollment.model";

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

  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return next(new CustomError("Category not found", 404));
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

  if (savedCourse) {
    const cache = new CacheService();
    cache.delete("courses").then((data) => {
      console.log("Cached Data: deleted");
    });
    cache.delete(`course:${savedCourse._id.toString()}`);
  }

  categoryModel
    .findByIdAndUpdate(categoryId, {
      $inc: { courseCount: 1 },
    })
    .then((data) => {
      console.log("updateded categorys:", data);
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

  const cache = new CacheService();

  if (JSON.stringify(req.query) == String(CACHE_TTL.courseBathCaching)) {
    const data = await cache.get(CACHE_TTL.courseBathCaching);
    if (data) {
      return res.status(200).json({
        message: "Courses fetched successfully",
        statusCode: 200,
        totalCourses: data.total,
        totalPages: Math.ceil(data.total / Number(size || 23)),
        success: true,
        courses: data.updatedCourses,
      });
    }
  }
  const { ids } = req.query;

  const pipeline = new ApiPipeline()
    .addStage({ $match: { status: "approved" } })
    .searchIds("categoryId", ids as unknown as Array<mongoose.Types.ObjectId>)
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
    courseModel.countDocuments({ status: "approved" }).lean(),
    courseModel.aggregate(pipeline).exec(),
  ]);

  const s3Instance = new S3Instance();

  const updatePromises = courses.map(async (course) => {
    // Process course thumbnail if it exists
    if (course?.thumbnail) {
      course.url = await s3Instance.getFile(course.thumbnail);
    }

    // Process instructor's thumbnail if instructor exists and has a thumbnail
    if (course.instructor?.avatar) {
      course.instructor.url = await s3Instance.getFile(
        course.instructor.avatar
      );
    }

    return course;
  });

  const updatedCourses = await Promise.all(updatePromises);

  // add cacheing
  if (JSON.stringify(req.query) == String(CACHE_TTL.courseBathCaching)) {
    if (updatedCourses && updateCourse.length > 0) {
      cache
        .set(
          CACHE_TTL.courseBathCaching,
          { total, updatedCourses },
          CACHE_TTL.Maincourses
        )
        .then(() => {
          console.log("Courses Catched successfully");
        });
    }
  }

  return res.status(200).json({
    message: "Courses fetched successfully",
    statusCode: 200,
    totalCourses: total,
    totalPages: Math.ceil(total / Number(size || 23)),
    success: true,
    courses: updatedCourses,
  });
};

export const getAllPendingCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { page, size, select, sort, search } = req.query;

  const cache = new CacheService();

  if (JSON.stringify(req.query) == String(CACHE_TTL.courseBathCaching)) {
    const data = await cache.get(CACHE_TTL.courseBathCaching);
    if (data) {
      return res.status(200).json({
        message: "Courses fetched successfully",
        statusCode: 200,
        totalCourses: data.total,
        totalPages: Math.ceil(data.total / Number(size || 23)),
        success: true,
        courses: data.updatedCourses,
      });
    }
  }
  const { ids } = req.query;

  const pipeline = new ApiPipeline()
    .addStage({ $match: { status: "pending" } })
    .searchIds("categoryId", ids as unknown as Array<mongoose.Types.ObjectId>)
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
    courseModel.countDocuments({ status: "pending" }).lean(),
    courseModel.aggregate(pipeline).exec(),
  ]);

  const s3Instance = new S3Instance();

  const updatePromises = courses.map(async (course) => {
    // Process course thumbnail if it exists
    if (course?.thumbnail) {
      course.url = await s3Instance.getFile(course.thumbnail);
    }

    // Process instructor's thumbnail if instructor exists and has a thumbnail
    if (course.instructor?.avatar) {
      course.instructor.url = await s3Instance.getFile(
        course.instructor.avatar
      );
    }

    return course;
  });

  const updatedCourses = await Promise.all(updatePromises);

  // add cacheing
  if (JSON.stringify(req.query) == String(CACHE_TTL.courseBathCaching)) {
    if (updatedCourses && updateCourse.length > 0) {
      cache
        .set(
          CACHE_TTL.courseBathCaching,
          { total, updatedCourses },
          CACHE_TTL.Maincourses
        )
        .then(() => {
          console.log("Courses Catched successfully");
        });
    }
  }

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
  const user = req.user;
  const pipeline = new ApiPipeline()
    .addStage({ $match: { status: "approved" } })
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

  const [total, courses, urlAvatar] = await Promise.all([
    courseModel.countDocuments({ status: "approved" }).lean(),
    courseModel.aggregate(pipeline).exec(),
    new S3Instance().getFile(user?.avatar as string),
  ]);

  if (user) {
    user.url = urlAvatar;
  }

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
    user: sanatizeUser(user as Iuser),
  });
};

// get single course
export const getPendingCourseById = async (
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
        bio: 1,
        jobTitle: 1,
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
        courseCount: 1,
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
        status: { $first: "$status" },
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
      allowFields: [...defaultFields, "sections", "videos", "status"],
      defaultFields: [...defaultFields, "sections", "videos", "status"],
      select: undefined,
    })
    .build();

  const courseArray = await courseModel.aggregate(pipeline);

  if (!courseArray.length) {
    return next(new CustomError("Course not found", 404));
  }

  let course = courseArray[0];

  const promises: Promise<void>[] = [];

  if (course.thumbnail) {
    const courseUrlPromise = new S3Instance()
      .getFile(course.thumbnail)
      .then((url) => {
        course.url = url;
      });
    promises.push(courseUrlPromise);
  }

  if (course.instructor?.avatar) {
    const instructorUrlPromise = new S3Instance()
      .getFile(course.instructor.avatar)
      .then((url) => {
        course.instructor.url = url;
      });
    promises.push(instructorUrlPromise);
  }

  if (course?.category?.thumbnail) {
    const categoryUrlPromise = new S3Instance()
      .getFile(course.category.thumbnail)
      .then((url) => {
        course.category.url = url;
      });
    promises.push(categoryUrlPromise);
  }

  await Promise.all(promises);

  return res.status(200).json({
    message: "Course fetched successfully",
    statusCode: 200,
    success: true,
    purchased: req?.purchased || false,
    course,
  });
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const cached = new CacheService();
  const cachedCourse = await cached.get(`course:${id}`);
  console.log(cachedCourse);

  if (cachedCourse) {
    return res.status(200).json({
      message: "Course fetched successfully",
      statusCode: 200,
      success: true,
      course: cachedCourse,
    });
  }

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
        bio: 1,
        jobTitle: 1,
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
        courseCount: 1,
      }
    )
    .addStage({
      $lookup: {
        from: "sections",
        let: { courseId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$courseId", "$$courseId"] } } },
          { $match: { status: "approved" } },
          {
            $project: {
              _id: 1,
              title: 1,
              order: 1,
              status: 1,
            },
          },
        ],
        as: "sections",
      },
    })
    .addStage({
      $unwind: { path: "$sections", preserveNullAndEmptyArrays: true },
    })
    .addStage({
      $lookup: {
        from: "videos",
        let: { sectionId: "$sections._id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$sectionId", "$$sectionId"] } } },
          { $match: { status: "approved" } },
          {
            $project: {
              _id: 1,
              sectionId: 1,
              title: 1,
              order: 1,
              video_key: 1,
              publicView: 1,
              status: 1,
              process: 1,
              duration: 1,
            },
          },
        ],
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
        status: { $first: "$status" },
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
      allowFields: [...defaultFields, "sections", "videos", "status"],
      defaultFields: [...defaultFields, "sections", "videos", "status"],
      select: undefined,
    })
    .build();

  const courseArray = await courseModel.aggregate(pipeline);

  if (!courseArray.length) {
    return next(new CustomError("Course not found", 404));
  }

  let course = courseArray[0];

  const promises: Promise<void>[] = [];

  if (course.thumbnail) {
    const courseUrlPromise = new S3Instance()
      .getFile(course.thumbnail)
      .then((url) => {
        course.url = url;
      });
    promises.push(courseUrlPromise);
  }

  if (course.instructor?.avatar) {
    const instructorUrlPromise = new S3Instance()
      .getFile(course.instructor.avatar)
      .then((url) => {
        course.instructor.url = url;
      });
    promises.push(instructorUrlPromise);
  }

  if (course?.category?.thumbnail) {
    const categoryUrlPromise = new S3Instance()
      .getFile(course.category.thumbnail)
      .then((url) => {
        course.category.url = url;
      });
    promises.push(categoryUrlPromise);
  }

  await Promise.all(promises);

  if (course) {
    cached.set(`course:${id}`, course, CACHE_TTL.singleCourse).then(() => {
      console.log("Course Cached successfully");
    });
  }

  return res.status(200).json({
    message: "Course fetched successfully",
    statusCode: 200,
    purchased: req.purchased || false,
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
      ...courseUpdate,
    };
    const updated = await courseModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, lean: true }
    );

    if (updated) {
      const cache = new CacheService();
      cache.delete("courses").then((data) => {
        console.log("Cached Data: deleted");
      });
      cache.delete(`course:${updated._id.toString()}`);
    }

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

  const [Course, sections, videos] = await Promise.all([
    courseModel.findById(id).lean(),
    sectionModel.find({ courseId: id }),
    videoModel.find({ courseId: id }),
  ]);

  if (!Course) {
    return next(new CustomError("Course not found", 404));
  }

  const hasApproved = [...sections, ...videos].some(
    (item) => item.status === "approved"
  );

  if (hasApproved) {
    await courseModel.updateOne({ _id: id }, { status: "delete" });

    return res.status(200).json({
      message: "Course marked as deleted (has approved content)",
      statusCode: 200,
      success: true,
    });
  }

  // Build key list for deletion
  const keys: string[] = [];
  if (Course.thumbnail) keys.push(Course.thumbnail);

  videos.forEach((video) => {
    if (video.video_key) keys.push(video.video_key);
  });

  const [deleteCourse, filesDelete] = await Promise.all([
    courseModel.deleteOne({ _id: id }),
    new S3Instance().deleteFiles(keys),
  ]);

  if (
    deleteCourse.deletedCount <= 0 ||
    !filesDelete ||
    filesDelete.length <= 0
  ) {
    return next(
      new CustomError("Error when deleting course or media files", 500)
    );
  }

  // Delete cache
  const cache = new CacheService();
  await Promise.all([cache.delete("courses"), cache.delete(`course:${id}`)]);

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

    if (
      !collectionName ||
      !searchFilters ||
      typeof searchFilters !== "string"
    ) {
      return next(
        new CustomError(
          "Valid collection name and search term are required",
          400
        )
      );
    }

    const searchRegex = new RegExp(searchFilters, "i");

    if (collectionName === "courses") {
      type CourseWithPopulatedFields = {
        _id: any;
        title: string;
        thumbnail?: string;
        instructorId: {
          _id: any;
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
          status: "approved",
          $or: [{ title: searchRegex }, { description: searchRegex }],
        })
        .populate<
          Pick<CourseWithPopulatedFields, "instructorId" | "categoryId">
        >([
          { path: "instructorId", select: "_id firstName lastName avatar" },
          { path: "categoryId", select: "title thumbnail" },
        ])
        .limit(8)
        .lean();

      const processedCourses = await Promise.all(
        courses.map(async (course) => {
          const thumbnailUrl = course.thumbnail
            ? await new S3Instance().getFile(course.thumbnail)
            : undefined;

          const avatarUrl = await new S3Instance().getFile(
            course.instructorId.avatar as string
          );
          return {
            ...course,
            categoryId: undefined,
            url: thumbnailUrl,
            instructor: {
              _id: course.instructorId?._id,
              firstName: course.instructorId?.firstName || "",
              lastName: course.instructorId?.lastName || "",
              avatar: course.instructorId?.avatar || "",
              url: avatarUrl,
            },
            category: {
              title: course.categoryId?.title || "",
              thumbnail: course.categoryId?.thumbnail || "",
            },
          };
        })
      );

      return res.status(200).json({
        status: "success",
        data: processedCourses,
      });
    } else if (collectionName === "instructors") {
      type InstructorWithCourses = {
        _id: any;
        firstName: string;
        lastName: string;
        avatar?: string;
        role: string;
        verificationStatus: string;
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
          verificationStatus: "approved",
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
          ],
        })
        .select("-password -email -refreshToken -__v")
        .populate<Pick<InstructorWithCourses, "courses">>({
          path: "courses",
          select: "title thumbnail price rating",
          options: { limit: 3 },
        })
        .limit(8)
        .lean();

      const processedInstructors = await Promise.all(
        instructors.map(async (instructor) => {
          const avatarUrl =
            instructor.avatar && !instructor.avatar.startsWith("http")
              ? await new S3Instance().getFile(instructor.avatar)
              : instructor.avatar;

          const processedCourses = await Promise.all(
            instructor.courses?.map(async (course) => ({
              ...course,
              url: course.thumbnail
                ? await new S3Instance().getFile(course.thumbnail)
                : undefined,
            })) || []
          );

          return {
            ...instructor,
            url: avatarUrl,
            courses: processedCourses,
          };
        })
      );

      return res.status(200).json({
        status: "success",
        data: processedInstructors,
      });
    } else {
      return next(
        new CustomError(
          "Invalid collection name. Use 'courses' or 'instructors'",
          400
        )
      );
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
    instructorId: userId,
  });

  if (!course) {
    return next(new CustomError("Course not found or unauthorized", 404));
  }

  if (course.status !== "none") {
    return next(
      new CustomError(`Course verification is already ${course.status}`, 400)
    );
  }

  // Check if course has at least one section and one video
  const sections = await sectionModel.find({ courseId });
  if (sections.length === 0) {
    return next(
      new CustomError(
        "Course must have at least one section to request verification",
        400
      )
    );
  }

  // Check videos for each section
  for (const section of sections) {
    const videos = await videoModel.find({ sectionId: section._id });
    if (videos.length === 0) {
      return next(
        new CustomError(
          `Section "${section.title}" must have at least one video`,
          400
        )
      );
    }
  }

  const [updatedCourse] = await Promise.all([
    courseModel.findByIdAndUpdate(
      courseId,
      { status: "pending" },
      { new: true }
    ),
    sectionModel.updateMany({ courseId }, { status: "pending" }),
    videoModel.updateMany({ courseId }, { status: "pending" }),
  ]);

  res.status(200).json({
    success: true,
    message: "Verification request submitted successfully",
    course: updatedCourse,
  });
};

export const filerCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {};

export const checkLogin = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = req.cookies;

    if (accessToken && refreshToken) {
      console.log({ accessToken, refreshToken });
      return isAuth([Roles.Admin, Roles.Instructor, Roles.User])(
        req,
        res,
        next
      );
    } else {
      console.log("hiiiiiiiiiiiiiiiiiiii");

      req.user = undefined;
      next();
    }
  };
};

export const isPurchased = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { id } = req.params;
    if (user) {
      const isEnrolement = await EnrollmentModel.findOne({
        userId: req?.user?._id,
        courseId: id,
        paymentStatus: "completed",
      });
      console.log({ isEnrolement });

      if (isEnrolement) {
        req.purchased = true;
      } else {
        req.purchased = false;
      }
      return next();
    } else {
      req.purchased = false;
      return next();
    }
  };
};
