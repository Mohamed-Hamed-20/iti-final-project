import { model, Schema, Types, Document } from "mongoose";

export interface ICart extends Document {
  userId: Types.ObjectId;
  courses: Types.ObjectId[];
  isCartAdded: Boolean;
  createdAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true 
    },
    courses: [{
      type: Schema.Types.ObjectId,
      ref: "course",
      required: true
    }],
    isCartAdded: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const cartModel = model<ICart>("cart", cartSchema);
