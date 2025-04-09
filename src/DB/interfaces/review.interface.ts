import { Schema } from "mongoose";
import { Iuser } from "./user.interface";

export interface IReview {
  _id?: string;
  userId: Schema.Types.ObjectId;
  referenceId: Schema.Types.ObjectId;
  referenceType: "course" | "instructor";
  rating: number;
  comment: string;
  isEnrolled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  user?: Iuser;
}
