import { Request, Response, NextFunction } from "express";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import { handleVideoAndThumbnail } from "./vidoe.helper";
import S3Instance from "../../../utils/aws.sdk.s3";
import { CustomError } from "../../../utils/errorHandling";
import courseModel from "../../../DB/models/courses.model";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_S3Keys } from "../../../config/env";
import redis from "../../../utils/redis";
import { Types } from "mongoose";

export const addVideo = async (
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

  if (!chkSection || !chkSection?.courseId || chkSection?.courseId?._id.toString() !== String(courseId)) {
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
  const { videoFilePath } = await handleVideoAndThumbnail(
    req.file.originalname as string,
    chkSection,
    videoId,
    title
  );

  req.file.folder = videoFilePath as string;

  // Upload video file to S3
  const s3Instance = new S3Instance();
  const videodata = await s3Instance.uploadLargeFile(req.file, videoFilePath, req.file.originalname);

  // Validate upload success
  if (!videodata || videodata instanceof Error) {
    return next(new CustomError("Error uploading video", 500));
  }

  // Store uploaded file key in database
  video.video_key = videodata.Key;

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

  // Try fetching URLs from Redis cache
  const cachedVideoUrl = await redis.get(`video_url:${video_key}`);

  if (cachedVideoUrl) {
    console.log("✅ Fetched from Redis Cache!");
    return res.status(200).json({
      video,
      video_url: cachedVideoUrl,
    });
  }

  // Fetch video and thumbnail URLs in parallel
  const video_url = await new S3Instance().getFile(video_key);

  if (!video_url) {
    return next(new CustomError("Error fetching video or thumbnail", 500));
  }

  // Cache URLs in Redis for 2 hours
  await redis.setex(`video_url:${video_key}`, 7200, video_url);

  return res.status(200).json({ video, video_url });
};
