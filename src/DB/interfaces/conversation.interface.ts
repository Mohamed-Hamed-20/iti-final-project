import mongoose from "mongoose";
import { Iuser } from "./user.interface";

export interface IConversation extends Document {
  participants: Array<mongoose.Types.ObjectId> | Array<Iuser> | any;
  lastMessage: {
    content: string;
    sender: mongoose.Types.ObjectId;
    createdAt: Date;
  };
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: string;
  isdelivered: boolean;
  isRead: boolean;
}
