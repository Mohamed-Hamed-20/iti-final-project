import { Schema, model } from "mongoose";
import { IReview } from "../interfaces/review.interface";

const reviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "User ID is required"],
      ref: "user",
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: [true, "Reference ID is required"],
    },
    referenceType: {
      type: String,
      required: [true, "Reference type is required"],
      enum: ["course", "instructor"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [3, "Comment must be at least 3 characters long"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews from the same user
reviewSchema.index(
  { userId: 1, referenceId: 1, referenceType: 1 },
  { unique: true }
);

reviewSchema.index({ instructorId: 1 });

const ReviewModel = model<IReview>("review", reviewSchema);

export default ReviewModel;
