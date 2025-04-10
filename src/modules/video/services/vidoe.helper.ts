import mongoose, { Schema, Types } from "mongoose";
import { CustomError } from "../../../utils/errorHandling";
import { Isection, IVideo } from "../../../DB/interfaces/videos.interface";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import courseModel from "../../../DB/models/courses.model";
import { FfmpegService } from "../../../utils/ffmpeg.video";

export const videoKey = async (
  section: any,
  videoId: Types.ObjectId,
  videoTitle: string
) => {
  const videoFileKey = `/courses/${section.courseId}/sections/${
    section._id
  }/videos/${videoId}/video-${videoId}-${videoTitle.replace(/\s/g, "-")}`;

  return videoFileKey;
};

/**
 * updateCourseTransation
 *
 * This asynchronous function updates the course information when a new video is added.
 * It performs the following operations as part of a MongoDB transaction:
 * 1. Creates a new video document.
 * 2. Updates the corresponding section by incrementing its total duration and video count.
 * 3. Updates the corresponding course by incrementing its total duration and video count.
 *
 * All operations are executed within a transaction to ensure atomicity.
 *
 * @param courseId - The ID of the course.
 * @param sectionId - The ID of the section.
 * @param video - An object representing the video (implements IVideo interface), which includes fields like title and duration.
 *
 * @returns A promise that resolves with an object containing:
 *   - savedVideo: The saved video document.
 *   - updatedSection: The updated section document.
 *   - updatedCourse: The updated course document.
 *
 * @throws An error if any of the operations fail, or if one of the updates is missing.
 */

// export const updateCourseTransaction = async (
//   courseId: string | Types.ObjectId,
//   sectionId: string | Types.ObjectId,
//   video: IVideo | any
// ): Promise<{
//   savedVideo: any;
//   updatedSection: any;
//   updatedCourse: any;
// }> => {
//   const session = await mongoose.startSession();
//   await session.startTransaction();

//   console.log(session);
//   console.log({ courseId, sectionId, video });

//   try {
//     if (!video.title || typeof video.duration !== "number") {
//       throw new CustomError("Invalid video data", 400);
//     }

//     const videoDoc = new videoModel({
//       title: video.title,
//       sectionId,
//       courseId,
//       status: "pending",
//       process: "processing",
//       duration: video.duration,
//     });

//     videoDoc.video_key = await videoKey(
//       { _id: sectionId, courseId },
//       videoDoc._id,
//       video.title
//     );
//     console.log({videoDoc});

//     const [savedVideo, updatedSection, updatedCourse] = await Promise.all([
//       videoDoc.save({ session }),
//       sectionModel.findByIdAndUpdate(
//         sectionId,
//         { $inc: { totalDuration: video.duration, totalVideos: 1 } },
//         { new: true, lean: true, session }
//       ),
//       courseModel.findByIdAndUpdate(
//         courseId,
//         { $inc: { totalDuration: video.duration, totalVideos: 1 } },
//         { new: true, lean: true, session }
//       ),
//     ]);

//     if (!savedVideo || !updatedSection || !updatedCourse) {
//       throw new CustomError("Transaction failed: Missing data", 500);
//     }
//     console.log({ savedVideo, updatedSection, updatedCourse });

//     await session.commitTransaction();
//     return { savedVideo, updatedSection, updatedCourse };
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

export const updateCourseTransaction = async (
  courseId: string | Types.ObjectId,
  sectionId: string | Types.ObjectId,
  video: IVideo | any
): Promise<{
  savedVideo: any;
  updatedSection: any;
  updatedCourse: any;
}> => {
  try {
    if (!video.title || typeof video.duration !== "number") {
      throw new CustomError("Invalid video data", 400);
    }

    const videoDoc = new videoModel({
      title: video.title,
      sectionId,
      courseId,
      status: video.status,
      process: "processing",
      duration: video.duration,
      publicView: video.publicView,
    });

    videoDoc.video_key = await videoKey(
      { _id: sectionId, courseId },
      videoDoc._id,
      video.title
    );

    const [savedVideo, updatedSection, updatedCourse] = await Promise.all([
      videoDoc.save(),
      sectionModel.findByIdAndUpdate(
        sectionId,
        { $inc: { totalDuration: video.duration, totalVideos: 1 } },
        { new: true, lean: true }
      ),
      courseModel.findByIdAndUpdate(
        courseId,
        { $inc: { totalDuration: video.duration, totalVideos: 1 } },
        { new: true, lean: true }
      ),
    ]);

    if (!savedVideo || !updatedSection || !updatedCourse) {
      throw new CustomError("Transaction failed: Missing data", 500);
    }

    return { savedVideo, updatedSection, updatedCourse };
  } catch (error) {
    throw error;
  }
};
