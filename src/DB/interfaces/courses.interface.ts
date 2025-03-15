import mongoose from "mongoose";

export interface ICourse extends Document {
  title: string;
  description?: string;
  price: number;
  thumbnail: string;
  access_type: "free" | "paid" | "prime";
  instructorId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
}
