import { Schema, model, Document, Types } from "mongoose";
import { IPost, IComment, ILike } from "../interfaces/post.interface";
import { Iuser } from "../interfaces/user.interface"; 

// Comment Schema
const CommentSchema = new Schema<IComment>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Like Schema
const LikeSchema = new Schema<ILike>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Post Schema
const PostSchema = new Schema<IPost>({
  text: { 
    type: String, 
    required: true 
  },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  categoryId: { 
    type : Schema.Types.ObjectId,
    ref: "category",
    required: true
  },
  comments: [CommentSchema],
  likes: [LikeSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true, 
});

export const Post = model<IPost>("Post", PostSchema);

