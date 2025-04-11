import { NextFunction, Request, Response } from "express";
import { CustomError } from "../../../utils/errorHandling";
import { Iuser } from "../../../DB/interfaces/user.interface";
import conversationModel from "../../../DB/models/conversation.model";
import userModel from "../../../DB/models/user.model";
import ApiPipeline from "../../../utils/apiFeacture";
import { Types } from "mongoose";
import S3Instance from "../../../utils/aws.sdk.s3";

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
  const userId = new Types.ObjectId(req.user?._id);
  const { search, select, sort, page, size } = req.query;

  const pipeline = new ApiPipeline()
    .matchId({
      Id: userId as Types.ObjectId,
      field: "participants",
    })
    .addStage({
      $project: {
        _id: 1,
        lastMessage: 1,
        createdAt: 1,
        updatedAt: 1,
        otherParticipant: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$participants",
                as: "participant",
                cond: { $ne: ["$$participant", userId] },
              },
            },
            0,
          ],
        },
      },
    })
    .lookUp(
      {
        from: "users",
        localField: "otherParticipant",
        foreignField: "_id",
        as: "otherParticipant",
      },
      {
        firstName: 1,
        lastName: 1,
        avatar: 1,
      }
    )
    .build();

  const conversations = await conversationModel.aggregate(pipeline);

  const S3 = new S3Instance();
  const conversationsPromises = conversations.map(async (conversation) => {
    if (conversation.otherParticipant && conversation.otherParticipant.avatar) {
      conversation.otherParticipant.url = await S3.getFile(
        conversation.otherParticipant.avatar
      );
    }

    return conversation;
  });

  const resolvedConversations = await Promise.all(conversationsPromises);

  return res.status(200).json({
    message: "Conversation returned success",
    success: true,
    conversations: resolvedConversations,
  });
};

export const deleteConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId } = req.params;

  const conversation = await conversationModel.findById(conversationId).lean();

  if (!conversation) {
    return next(new CustomError("conversation not found", 400));
  }

  const deleted = await conversationModel.deleteOne({ _id: conversation });

  if (!deleted) {
    return next(new CustomError("Server error plz try again later", 500));
  }

  return res.status(200).json({
    message: "conversation delete successfully",
    success: true,
    statusCode: 200,
    userLoggedIn : req.user?._id,
    conversation,
  });
};
