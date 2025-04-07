import mongoose, { Schema } from "mongoose";
import { IConversation } from "../interfaces/conversation.interface";

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "user", required: true },
    ],
    lastMessage: {
      content: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: "user" },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ "lastMessage.sender": 1 });
conversationSchema.index({ "lastMessage.createdAt": 1 });

const conversationModel = mongoose.model<IConversation>(
  "conversation",
  conversationSchema
);

export default conversationModel;
