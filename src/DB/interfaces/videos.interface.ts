import mongoose from "mongoose";

// Video Schema
export interface IVideo extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  video_url: string;
  thumbnail_url: string;
  created_at: Date;
}
