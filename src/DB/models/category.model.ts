import mongoose, { Schema } from "mongoose";
import { ICategory } from "../interfaces/category.interface";

const CategorySchema = new Schema<ICategory>(
  {
    title: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    courseCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const categoryModel = mongoose.model<ICategory>("category", CategorySchema);

export default categoryModel;
