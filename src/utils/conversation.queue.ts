import Queue from "bull";
import { Types } from "mongoose";
import { REDIS } from "../config/env";
import conversationModel from "../DB/models/conversation.model";

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
  let conversation = await conversationModel.findOne({
    $and: [
      { participants: { $all: [userId, instructorId] } },
      { $expr: { $eq: [{ $size: "$participants" }, 2] } },
    ],
  });

  if (!conversation) {
    conversation = new conversationModel({
      participants: [userId, instructorId],
      lastMessage: {
        sender: instructorId,
        content: message,
        createdAt: Date.now(),
      },
    });

    await conversation.save();
    console.log(conversation, "conversation created success");
  }

  //   const io = getSocketIO();
  //   io.to("").emit("send-msg", {...conversation, });
});
