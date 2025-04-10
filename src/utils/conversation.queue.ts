import Queue from "bull";
import { Types } from "mongoose";
import { REDIS } from "../config/env";
import conversationModel from "../DB/models/conversation.model";
import messageModel from "../DB/models/message.model";

export const addNewconversation = async (
  instructorId: Types.ObjectId,
  userId: Types.ObjectId,
  message: string
) => {
  await conversationQueue.add(
    {
      userId,
      instructorId,
      message,
    },
    { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );
};

// Initialize a Bull queue for conversation processing with Redis configuration
const conversationQueue = new Queue("create-conversation", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

conversationQueue.process(async (job) => {
  const { userId, instructorId, message } = job.data;

  // Validate: prevent user from messaging themselves
  if (userId.toString() === instructorId.toString()) {
    console.warn("User cannot message themselves.");
    return;
  }

  let conversation = await conversationModel.findOneAndUpdate(
    {
      participants: { $all: [userId, instructorId] },
      // This ensures it's a private conversation (exactly 2 people)
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    },
    {
      $set: {
        "lastMessage.sender": instructorId,
        "lastMessage.content": message,
        "lastMessage.createdAt": new Date(),
      },
    },
    {
      new: true,
    }
  );

  if (!conversation) {
    conversation = await conversationModel.create({
      participants: [userId, instructorId],
      lastMessage: {
        sender: instructorId,
        content: message,
        createdAt: new Date(),
      },
    });
    await messageModel.create({
      conversationId: conversation._id,
      sender: instructorId,
      content: message,
      type: "text",
      isdelivered: false,
      isRead: false,
    });
    console.log("Conversation created successfully:", conversation);
  }

  // TODO: emit event if needed
  // const io = getSocketIO();
  // io.to(`room-${conversation._id}`).emit("send-msg", conversation);
});
