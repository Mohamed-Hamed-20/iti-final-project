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
  "bio",
  "avatar",
  "socialLinks",
  "jobTitle",
  "role",
  "courses",
];

export const instructors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { page, size, select, sort, search } = req.query;
  const { ids } = req.query;

  const pipeline = new ApiPipeline()
    .addStage({
      $match: { role: Roles.Instructor, verificationStatus: "approved" },
    })
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

export const getInstructorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as Iuser;

  if (!user) {
    return next(new CustomError("User not authenticated", 401));
  }

  const instructor = await userModel
    .findById(user._id)
    .select("-password -email")
    .populate<{ courses: ICourse[] }>({
      path: "courses",
      populate: {
        path: "categoryId",
        select: "title thumbnail",
      },
    })
    .orFail(new CustomError("Instructor not found", 404));

  if (!Array.isArray(instructor.courses)) {
    instructor.courses = [];
  }

  const keys = instructor.courses.map((course) => course.thumbnail);
  const urls = await new S3Instance().getFiles(keys);

  const result = instructor.toObject({
    virtuals: true,
    versionKey: false,
  });

  result.courses = result.courses.map((course: ICourse, index: number) => ({
    ...course,
    url: urls[index],
    instructor: {
      firstName: result.firstName,
      lastName: result.lastName,
      avatar: result.avatar,
    },
  }));

  return res.status(200).json({
    message: "Instructor fetched successfully",
    statusCode: 200,
    success: true,
    instructor: result,
  });
};

// export const getInstructorById = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { id } = req.params;

//   const instructor = await userModel
//     .findById(id)
//     .select("-password -email")
//     .populate({
//       path: "courses",
//       populate: {
//         path: "categoryId",
//       },
//     })
//     .lean();

//   if (!instructor) {
//     return next(new CustomError("Instructor not found", 404));
//   }

//   return res.status(200).json({
//     message: "Instructor fetched successfully",
//     statusCode: 200,
//     success: true,
//     instructor,
//   });
// };

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?._id;

  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }

  const folder = await userFileKey2(
    userId as unknown as string,
    req.file.originalname
  );

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

  console.log("Generated File Keys:", {
    frontId: fileKeys[0],
    backId: fileKeys[1],
    requiredVideo: fileKeys[2],
    optionalVideo: optionalFileKey || "No optional video provided",
  });

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

  console.log("User Updated:", updatedUser);

  return res.status(200).json({
    message:
      "Verification files uploaded successfully. Your verification status is now pending.",
    success: true,
    user: sanatizeUser(updatedUser),
    verificationStatus: "pending",
  });
};

// we can take a look about this code
// export const instructorVerification = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const user = req.user;
//   if (!user?._id) return next(new CustomError("Unauthorized", 401));

//   const files = req.files as Record<string, Express.Multer.File[]>;
//   const requiredFiles = ["frontID", "backID", "requiredVideo"];

//   // Validate required files
//   for (const file of requiredFiles) {
//     if (!files?.[file]?.[0])
//       return next(new CustomError(`Missing ${file}`, 400));
//   }

//   console.log("✅ Received Files:", files);

//   // Generate unique S3 file keys
//   const fileKeyPromises = requiredFiles.map((file) =>
//     userFileKey(user._id.toString(), file, files[file][0].originalname)
//   );
//   const fileKeys = await Promise.all(fileKeyPromises);

//   // Handle optional file if provided
//   const optionalFile = files.optionalVideo?.[0];
//   const optionalFileKey = optionalFile
//     ? await userFileKey(
//         user._id.toString(),
//         "optionalVideo",
//         optionalFile.originalname
//       )
//     : null;

//   console.log("Generated File Keys:", {
//     frontId: fileKeys[0],
//     backId: fileKeys[1],
//     requiredVideo: fileKeys[2],
//     optionalVideo: optionalFileKey || "No optional video provided",
//   });

//   // Upload files to S3
//   const uploadPromises = requiredFiles.map((file, index) => {
//     const fileToUpload = files[file][0]; // Always use the first file in the array
//     fileToUpload.folder = fileKeys[index]; // Assign unique key to folder
//     return new S3Instance().uploadLargeFile(fileToUpload);
//   });

//   // Upload optional file if exists
//   if (optionalFile && optionalFileKey) {
//     optionalFile.folder = optionalFileKey;
//     uploadPromises.push(new S3Instance().uploadLargeFile(optionalFile));
//   }

//   const uploadResults = await Promise.allSettled(uploadPromises);

//   let uploadedFiles: Record<string, string> = {};
//   let failedUploads: string[] = [];

//   uploadResults.forEach((result, index) => {
//     if (result.status === "fulfilled") {
//       const data = result.value as { Key: string; Location: string };
//       const fileName = requiredFiles[index] || "optionalVideo";
//       uploadedFiles[fileName] = data.Key;
//     } else {
//       failedUploads.push(requiredFiles[index] || "optionalVideo");
//     }
//   });

//   if (failedUploads.length > 0) {
//     return next(
//       new CustomError(`Error uploading files: ${failedUploads.join(", ")}`, 500)
//     );
//   }

//   console.log("Uploaded File Keys:", uploadedFiles);

//   // Update user document
//   const updatedUser = await userModel.findByIdAndUpdate(
//     user._id,
//     {
//       frontId: uploadedFiles.frontID,
//       backId: uploadedFiles.backID,
//       requiredVideo: uploadedFiles.requiredVideo,
//       optionalVideo: uploadedFiles.optionalVideo || "",
//     },
//     { new: true }
//   );

//   if (!updatedUser) return next(new CustomError("User not found", 404));

//   console.log("User Updated:", updatedUser);

//   return res.status(200).json({
//     message: "Verification files uploaded successfully",
//     success: true,
//     user: sanatizeUser(updatedUser),
//   });
// };

//Add It In Admin Panel
