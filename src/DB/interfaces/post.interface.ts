import { Document, Types } from "mongoose";
import { Iuser, Roles } from "./user.interface"

export interface IComment {
  _id?: Types.ObjectId;
  user?: Types.ObjectId | Iuser; 
  text: string;
  createdAt: Date;
}

export interface ILike {
  user?: Types.ObjectId | Iuser; 
  createdAt: Date;
}

export interface IPost extends Document {
  text: string;
  author: Types.ObjectId | Iuser; 
  category: string;
  comments: IComment[];
  likes: ILike[];
  createdAt: Date;
  updatedAt: Date;
}