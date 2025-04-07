import mongoose, { Schema } from "mongoose";
import { IMessage } from "../interfaces/conversation.interface";

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "conversation" },
    sender: { type: Schema.Types.ObjectId, ref: "user", required: true },
    content: { type: String, required: true },
    type: { type: String, default: "text" },
    isdelivered: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const messageModel = mongoose.model<IMessage>("message", messageSchema);

export default messageModel;
