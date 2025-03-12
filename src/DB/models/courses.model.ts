import mongoose, { Schema } from "mongoose";
import { ICourse } from "../interfaces/courses.interface";

const CourseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      required: true,
      default: "http://google.com",
    },
    access_type: {
      type: String,
      enum: ["free", "paid", "prime"],
      required: true,
    },
    instructorId: { type: Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

const courseModel = mongoose.model<ICourse>("course", CourseSchema);

export default courseModel;
