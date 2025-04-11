import { model, Schema, Types, Document } from "mongoose";

export interface IMeeting extends Document {
  userId: Types.ObjectId;
  instructorId: Types.ObjectId;
  courseId: Types.ObjectId;
  meetingLink: String,
  createdAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "course",
      required: false,
    },
    meetingLink: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const meetingModel = model<IMeeting>("meeting", meetingSchema);
