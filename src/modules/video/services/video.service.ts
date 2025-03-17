import { Request, Response, NextFunction } from "express";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import { handleVideoAndThumbnaile } from "./vidoe.helper";
import S3Instance from "../../../utils/aws.sdk.s3";
import { CustomError } from "../../../utils/errorHandling";
import courseModel from "../../../DB/models/courses.model";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_S3Keys } from "../../../config/env";
import redis from "../../../utils/redis";

export const addVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { title, sectionId } = req.body;

  if (!req.files) {
    return next(new CustomError("No files found", 400));
  }
  // Create a new video instance with the provided title and sectionId
  const video = new videoModel({ title, sectionId });

  // Check if the provided sectionId exists in the database
  const chkSection = await sectionModel.findById(sectionId);

  if (!chkSection) {
    return next(new CustomError("section not found", 404));
  }

  // Process video and thumbnail files before uploading
  const { videoFile, thumbnailFile } = await handleVideoAndThumbnaile(
    req?.files as { [key: string]: Express.Multer.File[] },
    chkSection,
    video._id,
    title
  );

  // Upload video and thumbnail to S3 asynchronously
  const [videodata, thumbnailData] = await Promise.all([
    new S3Instance().uploadLargeFile(videoFile),
    new S3Instance().uploadLargeFile(thumbnailFile),
  ]);

  // Validate that both files were uploaded successfully
  if (
    !videodata ||
    !thumbnailData ||
    videodata instanceof Error ||
    thumbnailData instanceof Error
  ) {
    return next(new CustomError("Error in uploading files", 500));
  }

  // Store the uploaded file URLs in the database
  video.video_key = videodata.Key || "";
  video.thumbnail_key = thumbnailData.Key || "";

  // Save the video record in the database
  await video.save();

  // Return a success response
  return res
    .status(200)
    .json({ message: "Files uploaded successfully!", video });
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

  const { video_key, thumbnail_key } = video;

  // Try fetching URLs from Redis cache
  const [cachedVideoUrl, cachedThumbnailUrl] = await Promise.all([
    redis.get(`video_url:${video_key}`),
    redis.get(`thumbnail_url:${thumbnail_key}`),
  ]);

  if (cachedVideoUrl && cachedThumbnailUrl) {
    console.log("✅ Fetched from Redis Cache!");
    return res.status(200).json({
      video,
      video_url: cachedVideoUrl,
      thumbnail_url: cachedThumbnailUrl,
    });
  }

  // Fetch video and thumbnail URLs in parallel
  const [videoUrlResult, thumbnailUrlResult] = await Promise.allSettled([
    new S3Instance().getFile(video_key),
    new S3Instance().getFile(thumbnail_key),
  ]);

  // Extract values and handle errors
  const video_url =
    videoUrlResult.status === "fulfilled" ? videoUrlResult.value : null;
  const thumbnail_url =
    thumbnailUrlResult.status === "fulfilled" ? thumbnailUrlResult.value : null;

  if (!video_url || !thumbnail_url) {
    return next(new CustomError("Error fetching video or thumbnail", 500));
  }

  // Cache URLs in Redis for 2 hours
  await Promise.all([
    redis.setex(`video_url:${video_key}`, 7200, video_url),
    redis.setex(`thumbnail_url:${thumbnail_key}`, 7200, thumbnail_url),
  ]);

  return res.status(200).json({ video, video_url, thumbnail_url });
};
