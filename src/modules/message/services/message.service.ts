import conversationModel from "../../../DB/models/conversation.model";
import messageModel from "../../../DB/models/message.model";
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../../../utils/errorHandling";
import { Types } from "mongoose";
import ApiPipeline from "../../../utils/apiFeacture";
import { Iuser } from "../../../DB/interfaces/user.interface";

export const allowfieldMessages = [
  "conversationId",
  "createdAt",
  "updatedAt",
  "sender",
  "content",
  "type",
  "isdelivered",
  "isRead",
];

const defaultFields = [
  "conversationId",
  "createdAt",
  "updatedAt",
  "sender",
  "content",
  "type",
  "isdelivered",
  "isRead",
];

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId } = req.query;
  const { sort, search, select, page, size } = req.query;

  if (!req.user) {
    return next(new CustomError("Un authntated", 400));
  }

  const userId = req.user._id;

  const conversation = await conversationModel
    .findById(conversationId)
    .lean()
    .select("participants");

  if (!conversation) {
    return next(new CustomError("Invaild conversation Id", 400));
  }

  if (
    !conversation.participants.some(
      (id: string) => id.toString() === userId.toString()
    )
  ) {
    return next(new CustomError("not allow to view this conversation", 401));
  }

  const pipeline = new ApiPipeline()
    .matchId({
      Id: conversationId as Types.ObjectId | any,
      field: "conversationId",
    })
    .match({
      fields: ["content"],
      op: "$or",
      search: search as string,
    })
    .sort(sort as string)
    .lookUp(
      {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
        isArray: false,
      },
      {
        firstName: 1,
        lastName: 1,
        jobTitle: 1,
        avatar: 1,
      }
    )
    .paginate(Number(page), Number(size))
    .projection({
      allowFields: allowfieldMessages,
      select: select as string,
      defaultFields: defaultFields,
    })
    .build();

  const messages = await messageModel.aggregate(pipeline);

  return res.status(200).json({
    message: "messages in conversation fetched success",
    success: true,
    StatusCode: 200,
    userLoggdIn: req.user._id,
    messages: messages,
  });
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { receiverId, content, conversationId } = req.body;
  const userId = req.user?._id;

  if (!receiverId || !content || !conversationId) {
    return next(new CustomError("Missing required fields", 400));
  }

  const conversation = await conversationModel.findById(conversationId);
  if (!conversation) {
    return next(new CustomError("Conversation not found", 404));
  }

  if (
    ![userId, receiverId].every((id) =>
      conversation.participants.some(
        (participant: string) => participant.toString() === id.toString()
      )
    )
  ) {
    return next(
      new CustomError(
        "User or receiver is not a participant in this conversation",
        401
      )
    );
  }

  const newMessage = await messageModel.create({
    sender: userId,
    content,
    conversationId,
    readBy: [],
    deliveredTo: [],
  });

  conversation.lastMessage = {
    content,
    createdAt: new Date(),
    sender: userId as Types.ObjectId,
  };

  await conversation.save();

  return res.status(200).json({
    message: "Message created successfully",
    success: true,
    data: newMessage,
  });
};
