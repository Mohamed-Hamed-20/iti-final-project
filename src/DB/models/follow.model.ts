import mongoose, { Schema } from "mongoose";
import { IFollow } from "../interfaces/follow.interface";

const followSchema = new Schema<IFollow>(
    {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true }); 

export default mongoose.model("Follow", followSchema);


