import { Request, Response, NextFunction } from "express";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import { updateCourseTransaction, videoKey } from "./vidoe.helper";
import S3Instance from "../../../utils/aws.sdk.s3";
import { CustomError } from "../../../utils/errorHandling";
import courseModel from "../../../DB/models/courses.model";
import redis from "../../../utils/redis";
import { Types } from "mongoose";
import { FfmpegService } from "../../../utils/ffmpeg.video";
import { title } from "process";
import { addVideoToQueue } from "../../../utils/video.queue";
import enrollmentModel from "../../../DB/models/enrollment.model";

export const addVideo2 = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { title, sectionId } = req.body;
  const { courseId } = req.query;

  if (!req.file) {
    return next(new CustomError("No video file found", 400));
  }

  console.log({ sectionId });

  // Validate sectionId
  const chkSection = await sectionModel
    .findOne({
      $or: [{ _id: sectionId }, { courseId }],
    })
    .populate({
      path: "courseId",
      select: "instructorId",
    });

  console.log(chkSection);

  if (
    !chkSection ||
    !chkSection?.courseId ||
    chkSection?.courseId?._id.toString() !== String(courseId)
  ) {
    return next(new CustomError("Section not found", 404));
  }

  // Create a new video instance with a manually generated _id
  const videoId = new Types.ObjectId();
  const video = new videoModel({
    _id: videoId,
    title,
    sectionId,
  });

  // Prepare file path
  const videoFilePath = await videoKey(chkSection, videoId, title);

  req.file.folder = videoFilePath as string;

  // Upload video file to S3
  const s3Instance = new S3Instance();
  const videodata = await s3Instance.uploadLargeFile(req.file);

  // Validate upload success
  if (!videodata || videodata instanceof Error) {
    return next(new CustomError("Error uploading video", 500));
  }

  // Store uploaded file key in database
  video.video_key = videoFilePath;

  // Save video record in database
  await video.save();

  return res.status(200).json({
    message: "Video uploaded successfully!",
    video,
  });
};

export const updateVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, sectionId } = req.body;
  const { videoId } = req.query;
};

export const createSignedVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { videoType, courseId } = req.body;
};

export const addVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  // Extract required fields from request body and query parameters
  const { title, sectionId, publicView } = req.body;
  const { courseId } = req.query;
  const user = req.user;

  // Extract video metadata (duration and size) using FfmpegService
  // Ensure req.file is available (it should be set by multer)
  if (!req.file || !req.file.path) {
    return next(new CustomError("Video file is missing", 400));
  }

  // Find the section by sectionId and courseId and populate course data (instructorId, title)
  const section = await sectionModel
    .findOne({ _id: sectionId, courseId: courseId })
    .populate<{ courseId: { _id: string; instructorId: string } }>({
      path: "courseId",
      select: "title instructorId",
    })
    .lean();

  if (!section) {
    return next(new CustomError("Invalid sectionId or courseId", 404));
  }

  // Validate that the section's courseId matches the provided courseId
  if (String(section.courseId?._id) !== String(courseId)) {
    return next(
      new CustomError("CourseId does not match section's course", 400)
    );
  }

  // Ensure the current user is the instructor of the course
  if (String(section.courseId.instructorId) !== String(user?._id)) {
    return next(
      new CustomError("Not allowed to upload video to this course", 403)
    );
  }

  const ffmpegService = new FfmpegService();
  const { durationInSecound, size } = await ffmpegService.getVideoMetadata(
    req.file.path
  );

  if (!size || !durationInSecound) {
    return next(new CustomError("Server Error: Missing video metadata", 500));
  }

  // Update the course and section documents within a transaction.
  // This function saves the video document and updates the related course and section.
  const { savedVideo, updatedCourse, updatedSection } =
    await updateCourseTransaction(String(courseId), sectionId, {
      title,
      duration: durationInSecound,
      publicView,
    });

  // add upload video to queue
  req.file.folder = savedVideo.video_key;
  await addVideoToQueue(req.file, savedVideo._id);

  // Return a success response
  return res
    .status(200)
    .json({ message: "Video uploaded successfully", video: savedVideo });
};

export const getVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { videoId } = req.query;

  // Fetch video metadata from the database
  const video = await videoModel.findById(videoId).lean();
  if (!video) return next(new CustomError("Video not found", 404));

  const { video_key } = video;
  console.log(video.status);

  if (video.status !== "approved") {
    return next(
      new CustomError("video Not approved yet to be accessable", 400)
    );
  }

  if (video?.publicView == false) {
    const isEnrollMent = await enrollmentModel.findOne({
      studentId: req?.user?._id,
      courseId: video.courseId,
      paymentStatus: "completeds",
    });

    if (!isEnrollMent) {
      return next(new CustomError("you should buy this course First", 400));
    }
  }

  // Fetch video and thumbnail URLs in parallel
  const video_url = await new S3Instance().getVideoFile(video_key);

  if (!video_url) {
    return next(new CustomError("Error fetching video or thumbnail", 500));
  }

  return res.status(200).json({
    message: "video featched successfully",
    success: true,
    statusCode: 200,
    video,
    video_url,
  });
};
