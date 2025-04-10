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

const defultFields = [
  "conversationId",
  "createdAt",
  "updatedAt",
  "sender",
  "content",
  "type",
  "isdelivered",
  "isRead",
  "sender.name",
  "sender._id",
  "sender.email",
  "sender.phone",
  "sender.lastSeen",
];

export const allowUserFields = [
  "_id",
  "name",
  "email",
  "phone",
  "role",
  "image",
  "lastSeen",
  "Trips",
];

interface PopulatedUser {
  _id: Types.ObjectId;
  userName: string;
  email: string;
}

interface PopulatedMessage {
  conversationId: Types.ObjectId;
  sender: PopulatedUser;
  receiver: PopulatedUser;
  content: string;
  createdAt: Date;
}

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId } = req.query;
  const user = req.user;
  const conversation = await conversationModel.findById(conversationId);

  if (!conversation) {
    return next(new CustomError("Invalid conversationId", 404));
  }

  if (!conversation.participants.includes(user?._id as any)) {
    return next(new CustomError("Not allow to view this conversation", 401));
  }

  const messages = await messageModel
    .find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .skip(0);

  return res.status(200).json({ success: true, messages });
};

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
    .lookUp({
      from: "users",
      localField: "sender",
      foreignField: "_id",
      as: "sender",
      isArray: false,
    })
    .addStage({
      $project: {
        _id: 1,
        createdAt: 1,
        updatedAt: 1,
        content: 1,
        isRead: 1,
        isdelivered: 1,
        type: 1,
        sender: allowUserFields.reduce<Record<string, any>>((acc, field) => {
          acc[field] = { $arrayElemAt: [`$sender.${field}`, 0] };
          return acc;
        }, {}),
      },
    })
    .paginate(Number(page), Number(size))
    .projection({
      allowFields: allowfieldMessages,
      select: select as string,
      defaultFields: defultFields,
    })
    .build();

  const messages = await messageModel.aggregate(pipeline);

  return res.status(200).json({
    message: "messages in conversation fetched success",
    success: true,
    StatusCode: 200,
    messages: messages,
  });
};

export const lastconversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  const userId = user?._id;

  const recentconversations = await messageModel
    .find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("sender", "userName email")
    .populate("receiver", "userName email")
    .lean();

  const conversationMap = new Map<string, any>();

  (recentconversations as any as PopulatedMessage[]).forEach((msg) => {
    const conversationPartner =
      msg.sender._id === userId ? msg.receiver : msg.sender;

    const partnerId = conversationPartner._id.toString();

    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, {
        conversationId: msg.conversationId,
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt,
        user: {
          id: conversationPartner._id,
          userName: conversationPartner.userName,
          email: conversationPartner.email,
        },
      });
    }
  });

  return res.status(200).json({
    success: true,
    recentconversations: Array.from(conversationMap.values()),
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

  const participantIds = conversation.participants.map((user: Types.ObjectId) =>
    user.toString()
  );

  if (
    !participantIds.includes(userId) ||
    !participantIds.includes(receiverId.toString())
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
