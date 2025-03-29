import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export class FfmpegService {
  /**
   * Get video metadata including formatted duration and size
   * @param filePath - Path to the video file
   * @returns Video metadata (formatted duration & size in bytes)
   */
  async getVideoMetadata(
    filePath: string
  ): Promise<{ durationInSecound: number; size: number }> {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    const stats = fs.statSync(filePath);
    const size = stats.size; // File size in bytes

    // Extract metadata
    const metadata = await this.probeVideo(filePath);
    const durationInSecound = metadata.format.duration ?? 0;

    return {
      durationInSecound,
      size,
    };
  }

  /**
   * Run ffprobe to get video metadata
   * @param filePath - Path to video file
   * @returns ffprobe metadata
   */
  private async probeVideo(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(new Error("Failed to retrieve video metadata"));
        else resolve(metadata);
      });
    });
  }

  /**
   * Convert duration (in seconds) to YouTube format (HH:MM:SS)
   * @param seconds - Total duration in seconds
   * @returns Formatted duration string
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formatted = [
      hours > 0 ? String(hours).padStart(2, "0") : null,
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ]
      .filter(Boolean) // Remove null values for HH if it's zero
      .join(":");

    return formatted;
  }

  /**
   * Compress video file and output to a specified path.
   * Assumes that the outputPath is within the 'uploads/compressed' folder.
   * @param inputPath - Path to the input video file
   * @param outputPath - Path where the compressed video will be saved
   * @returns The outputPath after successful compression
   */

  async compressVideo(inputPath: string, outputPath: string): Promise<string> {
    console.log({ inputPath, outputPath });

    if (!fs.existsSync(inputPath)) {
      console.log(`not found url ${inputPath}`);
      throw new Error("Input file does not exist");
    }

    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .videoFilters("scale=trunc(iw/2)*2:trunc(ih/2)*2")
        .outputOptions(["-preset fast", "-crf 28", "-b:a 128k", "-threads 4"])
        .on("start", (commandLine) => {
          console.log("🎬 Starting ffmpeg process:", commandLine);
        })
        .on("error", (err, stdout, stderr) => {
          console.error("❌ Error during compression:", err);
          console.error("stdout:", stdout);
          console.error("stderr:", stderr);
          reject(new Error(`Compression failed: ${err.message}`));
        })
        .on("end", () => {
          console.log("✅ Compression completed successfully");

          // Delete the original file after compression is successful
          try {
            if (fs.existsSync(inputPath)) {
              fs.unlinkSync(inputPath);
              console.log("🗑️ Original file deleted:", inputPath);
            }
          } catch (deleteErr) {
            console.error("⚠️ Failed to delete original file:", deleteErr);
          }

          resolve(outputPath);
        })
        .save(outputPath);
    });
  }
}
