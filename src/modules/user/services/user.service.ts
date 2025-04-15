import { CustomError } from "./../../../utils/errorHandling";
import { NextFunction, Request, Response } from "express";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { userFileKey } from "../../../utils/fileKeyGenerator";
import userModel from "../../../DB/models/user.model";
import bcrypt, { compare } from "bcryptjs";
import { encrypt } from "../../../utils/crpto";
import S3Instance from "../../../utils/aws.sdk.s3";
import redis from "../../../utils/redis";
import { ICourse } from "../../../DB/interfaces/courses.interface";
import { Iuser, Roles } from "../../../DB/interfaces/user.interface";
import ApiPipeline from "../../../utils/apiFeacture";
import mongoose, { Types } from "mongoose";
import { userFileKey2 } from "./user.helper";
import courseModel from "../../../DB/models/courses.model";
import followModel from "../../../DB/models/follow.model";
import { CacheService } from "../../../utils/redis.services";
import { meetingModel } from "../../../DB/models/meeting.model";
import emailQueue from "../../../utils/email.Queue";
import EarningsModel from "../../../DB/models/earning.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";

// interface MeetingRequest extends Request {
//   body: {
//     studentId: string;
//     meetingLink: string;
//     courseId?: string;
//   };
//   user: {
//     _id: Types.ObjectId;
//     firstName: string;
//     lastName: string;
//     email: string;
//   };
// }

export const profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const user = req.user;

  if (!user) {
    return next(new CustomError("Missing Server ERROR", 500));
  }

  if (user?.avatar) {
    user.url = await new S3Instance().getFile(user?.avatar as string);
  }

  return res.status(200).json({
    message: "user data fetched successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(user),
  });
};

const allowSearchFields = [
  "firstName",
  "lastName",
  "phone",
  "bio",
  "jobTitle",
  "courses.title",
];

const defaultFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "age",
  "isOnline",
  "verificationStatus",
  "bio",
  "avatar",
  "socialLinks",
  "jobTitle",
  "role",
  "courses",
  "totalRating",
  "rating",
];

export const instructors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { page, size, select, sort, search } = req.query;
  const { values } = req.query;

  const pipeline = new ApiPipeline()
    .addStage({
      $match: { role: Roles.Instructor, verificationStatus: "approved" },
    })
    .matchInValues("jobTitle", values as Array<string>)
    .lookUp(
      {
        from: "courses",
        localField: "_id",
        foreignField: "instructorId",
        as: "courses",
        isArray: true,
      },
      {
        title: 1,
        price: 1,
        rating: 1,
        totalVideos: 1,
        totalSections: 1,
        purchaseCount: 1,
        instructorId: 1,
        totalDuration: 1,
        status: 1,
      }
    )
    .addStage({
      $addFields: {
        courses: {
          $filter: {
            input: "$courses",
            as: "course",
            cond: { $eq: ["$$course.status", "approved"] },
          },
        },
      },
    })
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

  const [total, users] = await Promise.all([
    userModel.countDocuments({ role: Roles.Instructor }),
    userModel.aggregate(pipeline).exec(),
  ]);

  const s3Instance = new S3Instance();

  const updatePromises = users.map(async (user) => {
    // Process course thumbnail if it exists
    if (user?.avatar) {
      user.url = await s3Instance.getFile(user.avatar);
    }
    return user;
  });

  const updatedUsers = await Promise.all(updatePromises);

  return res.status(200).json({
    message: "instructors fetched successfully",
    success: true,
    statusCode: 200,
    totalUsers: total,
    totalPages: Math.ceil(total / Number(size || 23)),
    data: updatedUsers,
  });
};

export const allInstructors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { page, size, select, sort, search } = req.query;
  const { values } = req.query;

  const pipeline = new ApiPipeline()
    .addStage({
      $match: { role: Roles.Instructor },
    })
    .matchInValues("jobTitle", values as Array<string>)
    .lookUp(
      {
        from: "courses",
        localField: "_id",
        foreignField: "instructorId",
        as: "courses",
        isArray: true,
      },
      {
        title: 1,
        price: 1,
        rating: 1,
        totalVideos: 1,
        totalSections: 1,
        purchaseCount: 1,
        instructorId: 1,
        totalDuration: 1,
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

  const [total, users] = await Promise.all([
    userModel.countDocuments({ role: Roles.Instructor }),
    userModel.aggregate(pipeline).exec(),
  ]);

  const s3Instance = new S3Instance();

  const updatePromises = users.map(async (user) => {
    // Process course thumbnail if it exists
    if (user?.avatar) {
      user.url = await s3Instance.getFile(user.avatar);
    }
    return user;
  });

  const updatedUsers = await Promise.all(updatePromises);

  return res.status(200).json({
    message: "instructors fetched successfully",
    success: true,
    statusCode: 200,
    totalUsers: total,
    totalPages: Math.ceil(total / Number(size || 23)),
    data: updatedUsers,
  });
};

export const allEnrolledStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { user } = req;

  if (!user) {
    return next(new CustomError("User not authenticated", 401));
  }

  const students = await courseModel.aggregate([
    { $match: { instructorId: new mongoose.Types.ObjectId(user._id) } },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "courseId",
        pipeline: [{ $match: { paymentStatus: "completed" } }],
        as: "enrollments",
      },
    },
    { $unwind: "$enrollments" },
    {
      $lookup: {
        from: "users",
        localField: "enrollments.userId",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    {
      $group: {
        _id: "$student._id",
        firstName: { $first: "$student.firstName" },
        lastName: { $first: "$student.lastName" },
        email: { $first: "$student.email" },
        avatar: { $first: "$student.avatar" },
      },
    },
  ]);

  return res.status(200).json({
    message: "instructors fetched successfully",
    success: true,
    statusCode: 200,
    data: students,
  });
};

const baseUrl = `http://localhost:5173`;

export const createMeeting = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { studentId, meetingLink } = req.body;
    const { user: instructor } = req;

    if (!instructor) {
      return next(new CustomError("Unauthenticated instructor", 401));
    }

    if (!studentId || !meetingLink) {
      return next(
        new CustomError("studentId and meetingLink are required", 400)
      );
    }

    const student = await userModel.findById(studentId);
    if (!student) {
      return next(new CustomError("Student not found", 404));
    }

    const meeting = await meetingModel.create({
      instructorId: instructor._id,
      userId: studentId,
      meetingLink,
    });

    await emailQueue.add(
      {
        to: student.email,
        subject: `New Meeting Invitation from ${instructor.firstName} ${instructor.lastName}`,
        text: "Welcome to Edrasa! 🎉",
        html: `
            <p>Hello ${student.firstName},</p>
            <p>You have a new meeting from your instructor <strong>${instructor.firstName} ${instructor.lastName}</strong>.</p>
            <p>Join using this link: <a href="${baseUrl}/meeting/${meeting._id}" target="_blank" style="padding:10px 20px; background:#A5158C; color:white; border-radius:5px; text-decoration:none;">Join Meeting</a></p>
            <p>Thanks,</p>
            <p>Course Platform Team</p>
          `,
        message: "Edrasa",
      },
      { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
    );

    return res.status(201).json({
      success: true,
      message: "Meeting sent successfully to student",
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
};

export const getMeetingLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { meetingId } = req.params;
    const { user } = req;

    if (!user) {
      return next(new CustomError("Unauthenticated student", 401));
    }

    const student = await userModel.findById(user._id);
    if (!student) {
      return next(new CustomError("Student not found", 404));
    }

    const meeting = await meetingModel.findOne({
      _id: meetingId,
      userId: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "fetch Meeting link",
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
};

export const getInstructorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as Iuser;

  const pipeline = [
    {
      $match: { instructor: new mongoose.Types.ObjectId(user._id) },
    },
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructor",
      },
    },
    {
      $unwind: {
        path: "$instructor",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "instructorId",
        as: "courses",
        pipeline: [
          {
            $match: {
              status: "approved",
            },
          },
        ],
      },
    },
    {
      $unwind: "$courses",
    },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        duration: 1,
        price: 1,
        originalPrice: 1,
        access_type: 1,
        enrollments: 1,
        category: 1,
        instructor: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
        },
        courses: 1,
      },
    },
  ];

  const courses = await courseModel.aggregate(pipeline).exec();

  // Prepare avatar promise
  const avatarPromise = user.avatar
    ? new S3Instance().getFile(user.avatar)
    : Promise.resolve(null);

  // Prepare course thumbnails + instructor avatar promises
  const coursePromises = courses.map(async (course) => {
    const courseUrl = course.thumbnail
      ? await new S3Instance().getFile(course.thumbnail)
      : null;

    if (course.instructor?.avatar) {
      course.instructor.url = await new S3Instance().getFile(
        course.instructor.avatar
      );
    }

    return {
      ...course,
      url: courseUrl,
    };
  });

  const [userAvatar, updatedCourses] = await Promise.all([
    avatarPromise,
    Promise.all(coursePromises),
  ]);

  if (userAvatar) {
    user.url = userAvatar;
  }

  const instructor: any = sanatizeUser(user);
  instructor.courses = updatedCourses;

  return res.status(200).json({
    message: "Instructor fetched successfully",
    statusCode: 200,
    success: true,
    instructor,
  });
};

export const getInstructorFromURL = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const pipeline = [
    {
      $match: { instructorId: new mongoose.Types.ObjectId(id) },
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
      $unwind: {
        path: "$instructor",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        status: "approved",
      },
    },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        totalDuration: 1,
        price: 1,
        originalPrice: 1,
        access_type: 1,
        enrollments: 1,
        category: 1,
        instructor: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
        },
      },
    },
  ];

  const courses = await courseModel.aggregate(pipeline).exec();

  // First get the instructor details
  const instructor = await userModel.findById(id).lean().exec();

  if (!instructor) {
    return res.status(404).json({
      message: "Instructor not found",
      statusCode: 404,
      success: false,
    });
  }

  const followerCount = await followModel.countDocuments({ following: id });

  // Prepare avatar promise
  const avatarPromise = instructor.avatar
    ? new S3Instance().getFile(instructor.avatar)
    : Promise.resolve(null);

  // Prepare course thumbnails + instructor avatar promises
  const coursePromises = courses.map(async (course) => {
    const courseUrl = course.thumbnail
      ? await new S3Instance().getFile(course.thumbnail)
      : null;

    if (course.instructor?.avatar) {
      course.instructor.url = await new S3Instance().getFile(
        course.instructor.avatar
      );
    }

    return {
      ...course,
      url: courseUrl,
      duration: course.totalDuration
        ? course.totalDuration < 3600
          ? `${Math.floor(course.totalDuration / 60)}m`
          : `${Math.floor(course.totalDuration / 3600)}h ${Math.floor(
              (course.totalDuration % 3600) / 60
            )}m`
        : "0m",
    };
  });

  const [userAvatar, updatedCourses] = await Promise.all([
    avatarPromise,
    Promise.all(coursePromises),
  ]);

  if (userAvatar) {
    instructor.url = userAvatar;
  }

  const sanitizedInstructor: any = sanatizeUser(instructor);
  sanitizedInstructor.courses = updatedCourses;
  sanitizedInstructor.followerCount = followerCount;

  return res.status(200).json({
    message: "Instructor fetched successfully",
    statusCode: 200,
    success: true,
    instructor: sanitizedInstructor,
  });
};

export const getInstructorFromURLWithWholeCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const pipeline = [
    {
      $match: { instructorId: new mongoose.Types.ObjectId(id) },
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
      $unwind: {
        path: "$instructor",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        duration: 1,
        price: 1,
        originalPrice: 1,
        access_type: 1,
        enrollments: 1,
        category: 1,
        totalDuration: 1,
        level: 1,
        totalVideos: 1,
        instructor: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
        },
      },
    },
  ];

  const courses = await courseModel.aggregate(pipeline).exec();

  // First get the instructor details
  const instructor = await userModel.findById(id).lean().exec();

  if (!instructor) {
    return res.status(404).json({
      message: "Instructor not found",
      statusCode: 404,
      success: false,
    });
  }

  const followerCount = await followModel.countDocuments({ following: id });

  // Prepare avatar promise
  const avatarPromise = instructor.avatar
    ? new S3Instance().getFile(instructor.avatar)
    : Promise.resolve(null);

  // Prepare course thumbnails + instructor avatar promises
  const coursePromises = courses.map(async (course) => {
    const courseUrl = course.thumbnail
      ? await new S3Instance().getFile(course.thumbnail)
      : null;

    if (course.instructor?.avatar) {
      course.instructor.url = await new S3Instance().getFile(
        course.instructor.avatar
      );
    }

    return {
      ...course,
      url: courseUrl,
    };
  });

  const [userAvatar, updatedCourses] = await Promise.all([
    avatarPromise,
    Promise.all(coursePromises),
  ]);

  if (userAvatar) {
    instructor.url = userAvatar;
  }

  const sanitizedInstructor: any = sanatizeUser(instructor);
  sanitizedInstructor.courses = updatedCourses;
  sanitizedInstructor.followerCount = followerCount;

  return res.status(200).json({
    message: "Instructor fetched successfully",
    statusCode: 200,
    success: true,
    instructor: sanitizedInstructor,
  });
};

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?._id;

  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }
  let folder = req.user?.avatar;

  if (req.user?.avatar && req.user.avatar.startsWith("users")) {
    folder = req.user.avatar;
  } else {
    folder = await userFileKey2(userId as unknown as string);
  }
  req.file.folder = folder;

  const [user, isUploaded] = await Promise.all([
    await userModel.findByIdAndUpdate(
      userId,
      { avatar: folder },
      { new: true, lean: true }
    ),
    new S3Instance().uploadLargeFileWithPath(req.file),
  ]);

  if (!user || !isUploaded) {
    await userModel.updateOne(
      { _id: req.user?._id },
      { avatar: req.user?.avatar }
    );

    return next(new CustomError("SERVER ERROR !", 500));
  }

  await new CacheService().delete(`user:${userId}`);

  res.status(200).json({
    message: "Image uploaded successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(user),
  });
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  const isMatch = await bcrypt.compare(currentPassword, String(user.password));
  if (!isMatch) {
    return next(new CustomError("Current password is incorrect", 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  user.password = hashedPassword;
  await user.save();

  res.status(200).json({
    message: "Password changed successfully",
    statusCode: 200,
    success: true,
  });
};

export const userProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { firstName, lastName, phone } = req.body;
  const user = req.user;

  if (!user || !user._id) {
    return next(new CustomError("Unauthorized user", 401));
  }

  const encryptedPhone = phone
    ? encrypt(phone, String(process.env.SECRETKEY_CRYPTO))
    : undefined;

  const updateData: any = { firstName, lastName };
  if (encryptedPhone) updateData.phone = encryptedPhone;

  const updateUser = await userModel.findByIdAndUpdate(user._id, updateData, {
    new: true,
  });

  if (!updateUser) {
    return next(new CustomError("User not found during update", 404));
  }

  res.status(200).json({
    message: "User data updated successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(updateUser),
  });
};

export const instructorData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { firstName, lastName, phone, jobTitle, socialLinks, bio } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const encryptedPhone = phone
    ? encrypt(phone, String(process.env.SECRETKEY_CRYPTO))
    : undefined;

  const updateData: any = { firstName, lastName, jobTitle, socialLinks, bio };
  if (encryptedPhone) updateData.phone = encryptedPhone;

  const updateUser = await userModel.findByIdAndUpdate(userId, updateData, {
    new: true,
  });

  if (!updateUser) {
    return next(new CustomError("User not found during update", 404));
  }

  await new CacheService().delete(`user:${req.user?._id}`);

  res.status(200).json({
    message: "Instructor data updated successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(updateUser),
  });
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return res
      .status(400)
      .json({ status: "Something went wrong during db action" });
  }

  if (user.role === "admin") {
    return res
      .status(403)
      .json({ status: "Failed", message: "Admin accounts cannot be deleted" });
  }

  await userModel.findByIdAndDelete(userId);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  await new CacheService().delete(`user:${userId}`);

  res
    .status(200)
    .json({ status: "success", data: "Account deleted successfully" });
};

export const checkPass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { password } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return res
      .status(400)
      .json({ status: "Something went wrong during db action" });
  }

  const chkPassword: boolean = await compare(password, String(user.password));

  if (!chkPassword) {
    return next(new CustomError("Invalid Password", 404));
  }

  return res.status(200).json({
    message: "Password is correct",
    success: true,
    statusCode: 200,
  });
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  await new CacheService().delete(`user:${req.user?._id}`);

  return res.status(200).json({
    message: "Logout successful",
    success: true,
    statusCode: 200,
  });
};

export const instructorVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user?._id) return next(new CustomError("Unauthorized", 401));

  const files = req.files as Record<string, Express.Multer.File[]>;
  const requiredFiles = ["frontID", "backID", "requiredVideo"];

  // Validate required files
  for (const file of requiredFiles) {
    if (!files?.[file]?.[0])
      return next(new CustomError(`Missing ${file}`, 400));
  }

  console.log("✅ Received Files:", files);

  // Generate unique S3 file keys
  const fileKeyPromises = requiredFiles.map((file) =>
    userFileKey(user._id.toString(), file, files[file][0].originalname)
  );
  const fileKeys = await Promise.all(fileKeyPromises);

  const optionalFile = files.optionalVideo?.[0];
  const optionalFileKey = optionalFile
    ? await userFileKey(
        user._id.toString(),
        "optionalVideo",
        optionalFile.originalname
      )
    : null;

  // Upload files to S3
  const uploadPromises = requiredFiles.map((file, index) =>
    new S3Instance().uploadMulipleLargeFile(
      files[file][0],
      file,
      fileKeys[index]
    )
  );

  if (optionalFile) {
    uploadPromises.push(
      new S3Instance().uploadMulipleLargeFile(
        optionalFile,
        "optionalVideo",
        optionalFileKey!
      )
    );
  }

  const uploadResults = await Promise.allSettled(uploadPromises);

  let uploadedFiles: Record<string, string> = {};
  let failedUploads: string[] = [];

  uploadResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const data = result.value as { Key: string; Location: string };
      const fileName = requiredFiles[index] || "optionalVideo";
      uploadedFiles[fileName] = data.Key;
    } else {
      failedUploads.push(requiredFiles[index] || "optionalVideo");
    }
  });

  if (failedUploads.length > 0) {
    return next(
      new CustomError(`Error uploading files: ${failedUploads.join(", ")}`, 500)
    );
  }

  console.log("Uploaded File Keys:", uploadedFiles);

  // Update user document with verification status and files
  const updatedUser = await userModel.findByIdAndUpdate(
    user._id,
    {
      frontId: uploadedFiles.frontID,
      backId: uploadedFiles.backID,
      requiredVideo: uploadedFiles.requiredVideo,
      optionalVideo: uploadedFiles.optionalVideo || "",
      verificationStatus: "pending",
    },
    { new: true }
  );

  if (!updatedUser) return next(new CustomError("User not found", 404));
  await new CacheService().delete(`user:${user._id}`);

  return res.status(200).json({
    message:
      "Verification files uploaded successfully. Your verification status is now pending.",
    success: true,
    user: sanatizeUser(updatedUser),
    verificationStatus: "pending",
  });
};

export const followInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { instructorId } = req.params;
  const { user } = req;

  if (!user) throw new Error("User is undefined!");

  if (user._id.toString() === instructorId) {
    return next(new CustomError("You can't follow yourself!", 400));
  }

  const isAlreadyFollowing = await followModel.findOne({
    follower: user._id,
    following: instructorId,
  });

  if (isAlreadyFollowing) {
    return next(new CustomError("Already following this instructor", 400));
  }

  const followDoc = new followModel({
    follower: user._id,
    following: instructorId,
  });

  const saved = await followDoc.save();

  if (!saved) {
    return next(new CustomError("Failed to follow instructor", 500));
  }
  await new CacheService().delete(`user:${user._id}`);

  res.status(200).json({
    message: "Instructor followed successfully",
    success: true,
    data: saved,
  });
};

export const unfollowInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { instructorId } = req.params;
  const { user } = req;

  if (!user) throw new Error("User is undefined!");

  const deleted = await followModel.findOneAndDelete({
    follower: user._id,
    following: instructorId,
  });

  if (!deleted) {
    return next(new CustomError("You are not following this instructor", 400));
  }

  await new CacheService().delete(`user:${user._id}`);

  res.status(200).json({
    message: "Instructor unfollowed successfully",
    success: true,
  });
};

export const getMyFollowings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req;

  if (!user) return next(new CustomError("Unauthorized", 401));

  const followings = await followModel
    .find({ follower: user._id })
    .select("following");

  const followingIds = followings.map((f) => f.following);

  res.status(200).json({
    success: true,
    data: followingIds,
  });
};

export const instructorSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const instructorId = req.user?._id;

  if (!instructorId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const [
    pendingCoursesCount,
    approvedCoursesCount,
    rejectedCoursesCount,
    totalEnrollmentsCount,
    earningsData,
    courses,
  ] = await Promise.all([
    courseModel.countDocuments({
      instructorId,
      status: { $in: ["pending", "none"] },
    }),
    courseModel.countDocuments({ instructorId, status: "approved" }),
    courseModel.countDocuments({ instructorId, status: "rejected" }),
    EnrollmentModel.countDocuments({
      instructorId: new mongoose.Types.ObjectId(instructorId),
      paymentStatus: "completed",
    }),
    EarningsModel.findOne({ instructorId }).select(
      "totalInstructorEarnings totalAdminEarnings"
    ),
    courseModel
      .find({ instructorId })
      .select("title subTitle price status rating totalRating purchaseCount")
      .sort({ purchaseCount: -1 })
      .limit(5),
  ]);

  // تحسين حساب النسبة المئوية للشراء
  const formattedCourses = courses.map((course) => {
    const purchaseCount = course.purchaseCount || 0;
    const percentage =
      totalEnrollmentsCount > 0
        ? (purchaseCount / totalEnrollmentsCount) * 100
        : 0;

    return {
      ...course.toObject(),
      purchasePercentage: Number(percentage.toFixed(2)),
    };
  });

  return res.status(200).json({
    message: "Instructor summary fetched successfully",
    statusCode: 200,
    success: true,
    data: {
      pendingCoursesCount,
      approvedCoursesCount,
      rejectedCoursesCount,
      totalEnrollmentsCount,
      totalInstructorEarnings: Number(
        (earningsData?.totalInstructorEarnings || 0).toFixed(2)
      ),
      instructorTotalUserRatingHim: req.user?.totalRating,
      instructorTotalUserReviewsHim: req.user?.rating,
      instructorAvgRatingHim:
        Number(req.user?.rating || 0) / Number(req.user?.totalRating || 1),
      courses: formattedCourses,
    },
  });
};

export const adminSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const [
    approvedCourse,
    pendingCourse,
    rejectedCourse,
    instructorCount,
    userCount,
    adminCount,
    totalEnrollments,
    totalEarningsData,
  ] = await Promise.all([
    courseModel.countDocuments({ status: "approved" }),
    courseModel.countDocuments({ status: "pending" }),
    courseModel.countDocuments({ status: "rejected" }),
    userModel.countDocuments({
      role: "instructor",
      isConfirmed: true,
      verificationStatus: "approved",
    }),
    userModel.countDocuments({ role: "user", isConfirmed: true }),
    userModel.countDocuments({ role: "admin", isConfirmed: true }),
    EnrollmentModel.countDocuments({ paymentStatus: "completed" }),
    EarningsModel.find({}).select("totalAdminEarnings totalInstructorEarnings"),
  ]);

  const totalEarnings = totalEarningsData.reduce(
    (acc: number, earning: any) => acc + earning.totalAdminEarnings,
    0
  );

  const totalInstructorEarnings = totalEarningsData.reduce(
    (acc: number, earning: any) => acc + earning.totalInstructorEarnings,
    0
  );

  return res.status(200).json({
    message: "Admin summary fetched successfully",
    statusCode: 200,
    success: true,
    data: {
      approvedCourse,
      pendingCourse,
      rejectedCourse,
      instructorCount,
      userCount,
      adminCount,
      totalEnrollments,
      totalAdminEarnings: Number(totalEarnings.toFixed(2)),
      totalInstructorEarnings: Number(totalInstructorEarnings.toFixed(2)),
    },
  });
};
