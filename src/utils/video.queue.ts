import Queue from "bull";
import { FfmpegService } from "./ffmpeg.video";
import path from "path";
import S3Instance from "./aws.sdk.s3";
import { CustomError } from "./errorHandling";
import { REDIS } from "../config/env";

const videoQueue = new Queue("video-processing", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

export const addVideoToQueue = async (file: Express.Multer.File) => {
  await videoQueue.add({ file }, { attempts: 1, backoff: 5000 });
};

videoQueue.process(async (job) => {
  const file: Express.Multer.File = job.data.file;

  console.log(`Processing video: ${file.path}`);

  if (!file.path) {
    throw new CustomError("File path not found", 404);
  }

  const outputPath = path.join(
    process.cwd(),
    "uploads/compressed",
    `${file.filename}`
  );

  console.log({ outputPath });

  try {
    await new FfmpegService().compressVideo(file.path, outputPath);
    file.path = outputPath;
    await new S3Instance().uploadLargeFileWithPath(file);
    console.log(`Video processed successfully: ${outputPath}`);
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  }
});

videoQueue.on("failed", (job, err) => {
  console.error(`Job failed for video ${job.data.videoId}: ${err.message}`);
});

videoQueue.on("completed", (job) => {
  console.log(`Video processing completed for: ${job.data.videoId}`);
});

export default videoQueue;
