import { Document, Types } from "mongoose";
import { Iuser, Roles } from "./user.interface";

export interface IComment {
  _id?: Types.ObjectId;
  user?: Iuser | Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ILike {
  user?: Iuser | Types.ObjectId;
  createdAt: Date;
}

export interface IPost extends Document {
  text: string;
  author: Types.ObjectId | Iuser;
  categoryId: Types.ObjectId;
  comments: IComment[];
  likes: ILike[];
  createdAt: Date;
  updatedAt: Date;
}
