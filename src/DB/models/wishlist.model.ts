import { model, Schema, Types, Document } from "mongoose";

interface IWishlist extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
}

const wishListSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "course",
      required: true
    }
  },
  { timestamps: true }
);

export const wishListModel = model<IWishlist>("wishlist", wishListSchema);
