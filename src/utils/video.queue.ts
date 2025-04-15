import Queue from "bull";
import { FfmpegService } from "./ffmpeg.video";
import path from "path";
import S3Instance from "./aws.sdk.s3";
import { CustomError } from "./errorHandling";
import { REDIS } from "../config/env";
import { Schema } from "mongoose";
import { videoModel } from "../DB/models/videos.model";

// Initialize a Bull queue for video processing with Redis configuration
const videoQueue = new Queue("video-processing", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

// Function to add a video processing job to the queue
export const addVideoToQueue = async (
  file: Express.Multer.File,
  videoId: Schema.Types.ObjectId
) => {
  await videoQueue.add({ file, videoId }, { attempts: 1, backoff: 5000 });
};

// Processing jobs from the queue
videoQueue.process(async (job) => {
  const file: Express.Multer.File = job.data.file;
  const videoId: Schema.Types.ObjectId = job.data.videoId;
  console.log(`Processing video: ${file.path}`);

  // Validate required fields
  if (!file.path) {
    throw new CustomError("File path not found", 404);
  }

  if (!videoId) {
    throw new CustomError("VideoId required", 400);
  }

  // Define output path for compressed video
  const outputPath = path.join(
    process.cwd(),
    "uploads/compressed",
    `${file.filename}`
  );

  try {
    // Compress the video file using Ffmpeg
    // await new FfmpegService().compressVideo(file.path, outputPath); // Edit compression quality here

    // Update file path to the compressed version
    // file.path = outputPath;

    // Upload the compressed video to AWS S3
    await new S3Instance().uploadLargeFileWithPath(file);

    console.log(`Video processed successfully: ${outputPath}`);
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  }
});

// Handle job failures
videoQueue.on("failed", async (job, err) => {
  // If a job fails, remove the corresponding video record from the database
  await videoModel.findByIdAndDelete(job.data.videoId);
  console.error(`Job failed for video ${job.data.videoId}: ${err.message}`);
});

// Handle successful job completion
videoQueue.on("completed", async (job) => {
  // Update the video process status in the database
  const { modifiedCount, acknowledged } = await videoModel.updateOne(
    { _id: job.data.videoId },
    { process: "completed" }
  );

  console.log(`Video processing completed for: ${job.data.videoId}`);
});

// Export the queue instance for use in other modules
export default videoQueue;
