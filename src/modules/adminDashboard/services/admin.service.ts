import { CustomError } from "./../../../utils/errorHandling";
import { NextFunction, Request, Response } from "express";
import userModel from "../../../DB/models/user.model";
import courseModel from "../../../DB/models/courses.model";
import {sectionModel} from "../../../DB/models/videos.model";
import {videoModel} from "../../../DB/models/videos.model";
import S3Instance from "../../../utils/aws.sdk.s3";
import { CacheService } from "../../../utils/redis.services";

export const getPendingVerifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      // Fetch all instructors with pending verification status
      const pendingInstructors = await userModel
        .find({
          role: "instructor",
          verificationStatus: "pending",
        })
        .select(
          "_id firstName lastName email verificationStatus frontId backId requiredVideo optionalVideo createdAt"
        )
        .lean();
  
      if (!pendingInstructors || pendingInstructors.length === 0) {
        return res.status(200).json({
          message: "No pending verifications found",
          status: "success",
          data: [],
        });
      }
  
      // Process each instructor to get their verification documents
      const instructorsWithFiles = await Promise.all(
        pendingInstructors.map(async (instructor) => {
          try {
            const { _id, frontId, backId, requiredVideo, optionalVideo } =
              instructor;
  
            // Skip if no documents exist
            if (!frontId && !backId && !requiredVideo && !optionalVideo) {
              return {
                ...instructor,
                documents: null,
              };
            }
  
            // Get file URLs from S3
            const fileKeys = [frontId, backId, requiredVideo, optionalVideo]
              .filter(
                (key): key is string =>
                  typeof key === "string" && key.trim() !== ""
              )
              .map((key) => {
                try {
                  return key.replace(
                    `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/`,
                    ""
                  );
                } catch (error) {
                  console.error(
                    `Error processing key for instructor ${_id}:`,
                    error
                  );
                  return null;
                }
              })
              .filter((key) => key !== null) as string[];
  
            const fileUrls =
              fileKeys.length > 0
                ? await new S3Instance().getFiles(fileKeys)
                : [];
  
            return {
              ...instructor,
              documents: {
                frontId: fileUrls[0] || null,
                backId: fileUrls[1] || null,
                requiredVideo: fileUrls[2] || null,
                optionalVideo: fileUrls[3] || null,
              },
            };
          } catch (error) {
            console.error(
              `Error processing instructor ${instructor._id}:`,
              error
            );
            return {
              ...instructor,
              documents: null,
              error: "Failed to load documents",
            };
          }
        })
      );
  
      return res.status(200).json({
        message: "Pending instructor verifications retrieved successfully",
        status: "success",
        count: instructorsWithFiles.length,
        data: instructorsWithFiles,
      });
    } catch (error) {
      console.error("Error in getPendingVerifications:", error);
      return next(
        new CustomError(
          "Failed to retrieve pending verifications. Please try again later.",
          500
        )
      );
    }
  };
  
  export const getAllInstructors = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      // Fetch all instructors with pending verification status
      const pendingInstructors = await userModel
        .find({
          role: "instructor",
        })
        .select(
          "_id firstName lastName email verificationStatus frontId backId requiredVideo optionalVideo createdAt"
        )
        .lean();
  
      if (!pendingInstructors || pendingInstructors.length === 0) {
        return res.status(200).json({
          message: "No pending verifications found",
          status: "success",
          data: [],
        });
      }
  
      // Process each instructor to get their verification documents
      const instructorsWithFiles = await Promise.all(
        pendingInstructors.map(async (instructor) => {
          try {
            const { _id, frontId, backId, requiredVideo, optionalVideo } =
              instructor;
  
            // Skip if no documents exist
            if (!frontId && !backId && !requiredVideo && !optionalVideo) {
              return {
                ...instructor,
                documents: null,
              };
            }
  
            // Get file URLs from S3
            const fileKeys = [frontId, backId, requiredVideo, optionalVideo]
              .filter(
                (key): key is string =>
                  typeof key === "string" && key.trim() !== ""
              )
              .map((key) => {
                try {
                  return key.replace(
                    `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/`,
                    ""
                  );
                } catch (error) {
                  console.error(
                    `Error processing key for instructor ${_id}:`,
                    error
                  );
                  return null;
                }
              })
              .filter((key) => key !== null) as string[];
  
            const fileUrls =
              fileKeys.length > 0
                ? await new S3Instance().getFiles(fileKeys)
                : [];
  
            return {
              ...instructor,
              documents: {
                frontId: fileUrls[0] || null,
                backId: fileUrls[1] || null,
                requiredVideo: fileUrls[2] || null,
                optionalVideo: fileUrls[3] || null,
              },
            };
          } catch (error) {
            console.error(
              `Error processing instructor ${instructor._id}:`,
              error
            );
            return {
              ...instructor,
              documents: null,
              error: "Failed to load documents",
            };
          }
        })
      );
  
      return res.status(200).json({
        message: "All instructors verifications retrieved successfully",
        status: "success",
        count: instructorsWithFiles.length,
        data: instructorsWithFiles,
      });
    } catch (error) {
      console.error("Error in getPendingVerifications:", error);
      return next(
        new CustomError(
          "Failed to retrieve pending verifications. Please try again later.",
          500
        )
      );
    }
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
  
    if (instructor.verificationStatus === "approved") {
      return res.status(200).json({
        message: "Instructor is already approved",
        success: true,
        statusCode: 200,
      });
    }
    instructor.verificationStatus = "approved";
    await instructor.save();
  
    return res.status(200).json({
      message: "Instructor approved successfully",
      success: true,
      statusCode: 200,
      verificationStatus: instructor.verificationStatus,
    });
  };

  export const rejectInstructor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | any> => {
    const { instructorId } = req.params;
    const { reason } = req.body;
  
    if (!reason) {
      return next(new CustomError("Rejection reason is required", 400));
    }
  
    const instructor = await userModel.findById(instructorId);
  
    if (!instructor) {
      return next(new CustomError("Instructor not found", 404));
    }
  
    if (instructor.verificationStatus === "rejected") {
      return res.status(200).json({
        message: "Instructor is already rejected",
        success: true,
        statusCode: 200,
      });
    }
  
    instructor.verificationStatus = "rejected";
    instructor.rejectionReason = reason;
    await instructor.save();
  
    return res.status(200).json({
      message: "Instructor rejected successfully",
      success: true,
      statusCode: 200,
      verificationStatus: instructor.verificationStatus,
    });
  };
  
  export const getPendingCourseVerifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
      const pendingCourses = await courseModel
        .find({
          status: "pending",
        })
        .populate({
          path: "instructorId",
          select: "firstName lastName email",
        })
        .populate({
          path: "categoryId",
          select: "name",
        })
        .lean();
  
      if (!pendingCourses || pendingCourses.length === 0) {
        return res.status(200).json({
          message: "No pending course verifications found",
          status: "success",
          data: [],
        });
      }
  
      const coursesWithDetails = await Promise.all(
        pendingCourses.map(async (course) => {
          try {
            // Get thumbnail URL from S3 if it exists
            let thumbnailUrl = course.thumbnail;
            if (course.thumbnail && !course.thumbnail.startsWith("http")) {
              thumbnailUrl = await new S3Instance().getFile(course.thumbnail);
            }
  
            // Get sections and videos count
            const sections = await sectionModel.find({ courseId: course._id });
            const videos = await videoModel.find({ courseId: course._id });
  
            return {
              ...course,
              thumbnail: thumbnailUrl,
              sectionsCount: sections.length,
              videosCount: videos.length,
              totalDuration: course.totalDuration,
            };
          } catch (error) {
            console.error(`Error processing course ${course._id}:`, error);
            return {
              ...course,
              thumbnail: null,
              sectionsCount: 0,
              videosCount: 0,
              error: "Failed to load course details",
            };
          }
        })
      );
  
      return res.status(200).json({
        message: "Pending course verifications retrieved successfully",
        status: "success",
        count: coursesWithDetails.length,
        data: coursesWithDetails,
      });

  };

  export const approveCourse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | any> => {
    const { courseId } = req.params;
  
      const course = await courseModel.findById(courseId);
  
      if (!course) {
        return next(new CustomError("Course not found", 404));
      }
  
      if (course.status === "approved") {
        return res.status(200).json({
          message: "Course is already approved",
          success: true,
          statusCode: 200,
        });
      }
  
      const [updatedCourse] = await Promise.all([
        courseModel.findByIdAndUpdate(
          courseId,
          { status: "approved" },
          { new: true }
        ),
        sectionModel.updateMany(
          { courseId },
          { status: "approved" }
        ),
        videoModel.updateMany(
          { courseId },
          { status: "approved" }
        )
      ]);
  
      return res.status(200).json({
        message: "Course approved successfully",
        success: true,
        statusCode: 200,
        status: updatedCourse?.status,
      });
  };

  export const rejectCourse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | any> => {
    const { courseId } = req.params;
    const { reason } = req.body;
  
    if (!reason) {
      return next(new CustomError("Rejection reason is required", 400));
    }
  
      const course = await courseModel.findById(courseId);
  
      if (!course) {
        return next(new CustomError("Course not found", 404));
      }
  
      if (course.status === "rejected") {
        return res.status(200).json({
          message: "Course is already rejected",
          success: true,
          statusCode: 200,
        });
      }
  
      const [updatedCourse] = await Promise.all([
        courseModel.findByIdAndUpdate(
          courseId,
          { 
            status: "rejected",
            rejectionReason: reason 
          },
          { new: true }
        ),
        sectionModel.updateMany(
          { courseId },
          { status: "rejected" }
        ),
        videoModel.updateMany(
          { courseId },
          { status: "rejected" }
        )
      ]);
  
      return res.status(200).json({
        message: "Course rejected successfully",
        success: true,
        statusCode: 200,
        status: updatedCourse?.status,
      });
  };

  export const getCourseVerificationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { courseId } = req.params;
  
      const course = await courseModel
        .findById(courseId)
        .populate({
          path: "instructorId",
          select: "firstName lastName email",
        })
        .populate({
          path: "categoryId",
          select: "name",
        });
  
      if (!course) {
        return next(new CustomError("Course not found", 404));
      }
  
      // Get thumbnail URL
      let thumbnailUrl = course.thumbnail;
      if (course.thumbnail && !course.thumbnail.startsWith("http")) {
        thumbnailUrl = await new S3Instance().getFile(course.thumbnail);
      }
  
      // Get all sections and videos
      const sections = await sectionModel.find({ courseId });
      const videos = await videoModel.find({ courseId });
  
      // Get video URLs
      const videosWithUrls = await Promise.all(
        videos.map(async (video) => {
          try {
            const videoUrl = await new S3Instance().getFile(video.video_key);
            return {
              ...video.toObject(),
              videoUrl,
            };
          } catch (error) {
            console.error(`Error processing video ${video._id}:`, error);
            return {
              ...video.toObject(),
              videoUrl: null,
              error: "Failed to load video",
            };
          }
        })
      );
  
      return res.status(200).json({
        message: "Course verification details retrieved successfully",
        status: "success",
        data: {
          course: {
            ...course.toObject(),
            thumbnail: thumbnailUrl,
          },
          sections,
          videos: videosWithUrls,
        },
      });

  };

  export const getDeleteCourseVerifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
      const pendingCourses = await courseModel
        .find({
          status: "delete",
        })
        .populate({
          path: "instructorId",
          select: "firstName lastName email",
        })
        .populate({
          path: "categoryId",
          select: "name",
        })
        .lean();
  
      if (!pendingCourses || pendingCourses.length === 0) {
        return res.status(200).json({
          message: "No delete course verifications found",
          status: "success",
          data: [],
        });
      }
  
      const coursesWithDetails = await Promise.all(
        pendingCourses.map(async (course) => {
          try {
            // Get thumbnail URL from S3 if it exists
            let thumbnailUrl = course.thumbnail;
            if (course.thumbnail && !course.thumbnail.startsWith("http")) {
              thumbnailUrl = await new S3Instance().getFile(course.thumbnail);
            }
  
            // Get sections and videos count
            const sections = await sectionModel.find({ courseId: course._id });
            const videos = await videoModel.find({ courseId: course._id });
  
            return {
              ...course,
              thumbnail: thumbnailUrl,
              sectionsCount: sections.length,
              videosCount: videos.length,
              totalDuration: course.totalDuration,
            };
          } catch (error) {
            console.error(`Error processing course ${course._id}:`, error);
            return {
              ...course,
              thumbnail: null,
              sectionsCount: 0,
              videosCount: 0,
              error: "Failed to load course details",
            };
          }
        })
      );
  
      return res.status(200).json({
        message: "Deleted course verifications retrieved successfully",
        status: "success",
        count: coursesWithDetails.length,
        data: coursesWithDetails,
      });

  };

  export const deleteCourse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;
  
    try {
      const [Course, videos] = await Promise.all([
        courseModel.findById(id).lean(),
        videoModel.find({ courseId: id }),
      ]);
  
      if (!Course) {
        return next(new CustomError("Course not found", 404));
      }
  
      // Collect all file keys to delete
      const keys: string[] = [];
  
      if (Course.thumbnail) keys.push(Course.thumbnail);
  
      if (videos.length) {
        keys.push(...videos.map((video) => video.video_key));
      }
  
      // Delete course and files
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
          new CustomError("Error while deleting course or files", 500)
        );
      }
  
      // Optionally: delete related sections and videos (if needed)
      await Promise.all([
        sectionModel.deleteMany({ courseId: id }),
        videoModel.deleteMany({ courseId: id }),
      ]);
  
      // Clear cache
      const cache = new CacheService();
      cache.delete("courses").then(() => {
      });
      cache.delete(`course:${id}`);
  
      return res.status(200).json({
        message: "Course deleted successfully",
        statusCode: 200,
        success: true,
      });
    } catch (error) {
      return next(new CustomError("Server Error", 500));
    }
  };
  
  
