import Queue from "bull";
import { Types } from "mongoose";
import { REDIS } from "../config/env";
import conversationModel from "../DB/models/conversation.model";

export const addNewconversation = async (
  instructorId: Types.ObjectId,
  userId: Types.ObjectId,
  message: string
) => {
  const conversation = new conversationModel({
    participants: [userId, instructorId],
    lastMessage: {
      sender: instructorId,
      content: message,
      createdAt: Date.now(),
    },
  });
  await conversationQueue.add({ conversation });
};

// Initialize a Bull queue for conversation processing with Redis configuration
const conversationQueue = new Queue("create-conversation", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

conversationQueue.process(async (job) => {
  const { conversation } = job.data;
  await conversation.save();
  console.log(conversation, "conversation created success");

  //   const io = getSocketIO();
  //   io.to("").emit("send-msg", {...conversation, });
});
