import { CustomError } from "./../../../utils/errorHandling";
import { NextFunction, Request, Response } from "express";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { userFileKey } from "../../../utils/fileKeyGenerator";
import userModel from "../../../DB/models/user.model";
import bcrypt, { compare } from "bcryptjs";
import { encrypt } from "../../../utils/crpto";
import S3Instance from "../../../utils/aws.sdk.s3";
import redis from "../../../utils/redis";
import { log } from "console";

export const profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const user = req.user;
  console.log("User object before sanitization:", user);

  if (!user) {
    return next(new CustomError("user not found ERROR", 500));
  }

  return res.status(200).json({
    message: "user data fetched successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(user),
  });
};

export const instructors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const users = await userModel
    .find({ role: "instructor", isApproved: true })
    .select("-password -email")
    .populate("courses")
    .lean();

  return res.status(200).json({
    message: "All instructors",
    status: "success",
    data: users,
  });
};

export const getInstructorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const instructor = await userModel
    .findById(id)
    .select("-password -email")
    .populate({
      path: "courses",
      populate: {
        path: "categoryId",
      },
    })
    .lean();

  if (!instructor) {
    return next(new CustomError("Instructor not found", 404));
  }

  return res.status(200).json({
    message: "Instructor fetched successfully",
    statusCode: 200,
    success: true,
    instructor,
  });
};

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }

  const imagePath = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  const userId = req.user?._id;
  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const user = await userModel.findByIdAndUpdate(
    userId,
    { avatar: imagePath },
    { new: true }
  );

  if (!user) {
    return next(new CustomError("User not found", 404));
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
  const { firstName, lastName, phone, jobTitle, socialLinks } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError("Unauthorized", 401));
  }

  const encryptedPhone = phone
    ? encrypt(phone, String(process.env.SECRETKEY_CRYPTO))
    : undefined;

  const updateData: any = { firstName, lastName, jobTitle, socialLinks };
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

  // Generate unique S3 file keys (only the relative path, no bucket URL)
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

  // Update user document
  const updatedUser = await userModel.findByIdAndUpdate(
    user._id,
    {
      frontId: uploadedFiles.frontID,
      backId: uploadedFiles.backID,
      requiredVideo: uploadedFiles.requiredVideo,
      optionalVideo: uploadedFiles.optionalVideo || "",
    },
    { new: true }
  );

  if (!updatedUser) return next(new CustomError("User not found", 404));

  console.log("User Updated:", updatedUser);

  return res.status(200).json({
    message: "Verification files uploaded successfully",
    success: true,
    user: sanatizeUser(updatedUser),
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
export const getInstructorVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { instructorId } = req.params;

  // Fetch instructor verification data from the database
  const instructorVerification = await userModel
    .findOne({ _id: instructorId })
    .lean();

  if (!instructorVerification) {
    return next(new CustomError("Instructor verification data not found", 404));
  }

  let { frontId, backId, requiredVideo, optionalVideo } =
    instructorVerification;

  // Redis cache keys
  const cacheKeys: Record<string, string> = {
    frontId: `verification:${instructorId}:frontId`,
    backId: `verification:${instructorId}:backId`,
    requiredVideo: `verification:${instructorId}:requiredVideo`,
    optionalVideo: `verification:${instructorId}:optionalVideo`,
  };

  // Check if data exists in Redis
  const cachedFiles = await Promise.all(
    Object.values(cacheKeys).map((key) => redis.get(key))
  );

  if (cachedFiles.every((url) => url)) {
    console.log("✅ Data fetched from Redis Cache!");
    return res.status(200).json({
      instructorId,
      frontId: cachedFiles[0],
      backId: cachedFiles[1],
      requiredVideo: cachedFiles[2],
      optionalVideo: cachedFiles[3],
    });
  }

  // Ensure we only fetch valid keys and remove S3 base URL
  const fileKeys = [frontId, backId, requiredVideo, optionalVideo]
    .filter(
      (key): key is string => typeof key === "string" && key.trim() !== ""
    )
    .map((key) =>
      key.replace(`https://${process.env.BUCKET_NAME}.s3.amazonaws.com/`, "")
    );

  console.log("Fetching files with keys:", fileKeys);

  const fileUrls = await new S3Instance().getFiles(fileKeys);

  // Store new file URLs in Redis with a 2-hour expiry
  Object.entries(cacheKeys).forEach(([key, cacheKey], index) => {
    if (fileUrls[index]) {
      redis.setex(cacheKey, 7200, fileUrls[index]);
    }
  });

  return res.status(200).json({
    instructorId,
    frontId: fileUrls[0] || "",
    backId: fileUrls[1] || "",
    requiredVideo: fileUrls[2] || "",
    optionalVideo: fileUrls[3] || "",
  });
};

export const approveInstructor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { instructorId } = req.params;

  // Find the user by ID and check if they are an instructor
  const instructor = await userModel.findById(instructorId);

  if (!instructor) {
    return next(new CustomError("Instructor not found", 404));
  }

  if (instructor.role !== "instructor") {
    return next(new CustomError("User is not an instructor", 400));
  }

  if (instructor.isApproved) {
    return res.status(200).json({
      message: "Instructor is already approved",
      success: true,
      statusCode: 200,
    });
  }

  // Update the isApproved field to true
  instructor.isApproved = true;
  await instructor.save();

  return res.status(200).json({
    message: "Instructor approved successfully",
    success: true,
    statusCode: 200,
  });
};
