import mongoose, { Schema } from "mongoose";
import { IVideo } from "../interfaces/videos.interface";

const VideoSchema = new Schema<IVideo>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    video_url: {
      type: String,
      required: true,
    },
    thumbnail_url: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const videoModel = mongoose.model<IVideo>("video", VideoSchema);

export default videoModel;
