import mongoose, { Document, Schema, Types } from "mongoose";

interface Imessage extends Document {
  message: string;
  senderId?: Types.ObjectId;
  receiverId: Types.ObjectId;
}

const messageSchema = new Schema<Imessage>(
  {
    message: {
      type: String,
      required: true,
      minlength: [1, "message Must be at least 1, got {VALUE}"],
      maxlength: [455, "message Must be at most 455, got {VALUE}"],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "user",
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
  },
  { timestamps: true }
);
messageSchema.index({ message: "text" });

const messageModel = mongoose.model("message", messageSchema);

export default messageModel;
