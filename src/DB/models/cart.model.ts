import { model, Schema, Types, Document } from "mongoose";

interface ICart extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
}

const cartSchema = new Schema<ICart>(
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

export const cartModel = model<ICart>("cart", cartSchema);
