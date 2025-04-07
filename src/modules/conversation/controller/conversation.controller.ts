import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../utils/errorHandling.js";
import { Iuser } from "../../../DB/interfaces/user.interface.js";
import conversationModel from "../../../DB/models/conversation.model.js";
import userModel from "../../../DB/models/user.model.js";
import ApiPipeline from "../../../utils/apiFeacture.js";
import { Types } from "mongoose";

export const allowConversationSortFields = [
  "participants",
  "lastMessage",
  "createdAt",
  "updatedAt",
  "lastMessage.createdAt",
  "lastMessage.sender",
  "lastMessage.content",
  "participants.name",
  "participants.email",
  "participants.role",
  "participants.image",
  "participants.lastSeen",
  "participants._id",
];

export const allowConversationFields = [
  "participants",
  "lastMessage",
  "createdAt",
  "updatedAt",
];

export const createconversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const senderId = req.user?._id;
  const { receiverId } = req.query;

  const receiver = await userModel.findById(receiverId);

  if (!receiver) return next(new CustomError("invaild receiverId", 404));

  const participants = [senderId, receiverId];
  let conversation = await conversationModel
    .findOne({
      participants: { $all: participants, $size: participants.length },
    })
    .populate("participants", "_id name image role email");

  if (!conversation) {
    conversation = await conversationModel.create({
      participants: [senderId, receiverId],
    });

    conversation = await conversationModel
      .findById(conversation._id)
      .populate("participants", "_id name image role email");
  }

  return res
    .status(201)
    .json({ message: "created success", success: true, conversation });
};

export const getconversationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId } = req.params;

  const conversation = await conversationModel
    .findById(conversationId)
    .populate("participants");

  if (!conversation)
    return res.status(404).json({ message: "conversation not found" });

  const isUserIn = conversation.participants.find((user: Iuser) => {
    return user._id.toString() == req.user?._id.toString();
  });

  if (!isUserIn) {
    return next(new CustomError("not allow to view this conversation", 401));
  }

  return res.json({ message: "found success", success: true, conversation });
};

export const searchConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;
  const { search, select, sort, page, size } = req.query;

  const pipeline = new ApiPipeline()
    .matchId({
      Id: userId as Types.ObjectId,
      field: "participants",
    })
    .sort(sort as string)
    .paginate(Number(page), Number(size))
    .lookUp({
      from: "users",
      localField: "participants",
      foreignField: "_id",
      as: "participants",
    })
    .lookUp({
      from: "users",
      localField: "lastMessage.sender",
      foreignField: "_id",
      as: "sender",
    })
    .match({
      search: search as string,
      op: "$or",
      fields: ["lastMessage.sender", "participants"],
    })
    .projection({
      allowFields: allowConversationSortFields,
      select: select as string,
      defaultFields: allowConversationFields,
    })
    .build();

  const conversations = await conversationModel.aggregate(pipeline);

  return res.status(200).json({
    message: "Conversation returned success",
    success: true,
    conversations,
  });
};
