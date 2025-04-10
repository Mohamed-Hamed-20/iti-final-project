import mongoose from "mongoose";

// Video Schema
export interface IVideo extends Document {
  _id: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  video_key: string;
  duration?: string;
  process?: "processing" | "completed" | "rejected";
  status?: "pending" | "approved" | "rejected" | "none";
  order?: number;
  publicView?: boolean;
}

export interface Isection extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  totalVideos: number;
  totalDuration: number;
  title: string;
  order?: number;
  status: "pending" | "approved" | "rejected" | "none";
}
