import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import messageModel from "../DB/models/message.model";
import conversationModel from "../DB/models/conversation.model";
import handleToken from "../utils/hadleToken";
import redis from "../utils/redis";
import { Iuser } from "../DB/interfaces/user.interface";
import { CustomError } from "../utils/errorHandling";
import { IMessage } from "../DB/interfaces/conversation.interface";

interface SeenPayload {
  receiverId: string;
  messageId: string;
}

interface CustomSocket extends Socket {
  userId?: string;
}

const isSocketConnected = (io: SocketIOServer, socketId: string): boolean => {
  const socket = io.sockets.sockets.get(socketId);
  return !!socket?.connected;
};

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
    transports: ["websocket", "polling"],
    path: "/socket.io/",
  });

  io.on("connection", async (socket: CustomSocket) => {
    console.log("User connected:", socket.id);

    socket.on("login", async (token: string) => {
      await handleJoin(socket, token);
    });

    socket.on("send_message", async (data: IMessage) => {
      await handleSendMessage(io, socket, data);
    });

    socket.on("message_seen", async (data: SeenPayload) => {
      const { receiverId, messageId } = data;

      const message = await messageModel.findByIdAndUpdate(
        messageId,
        { isRead: true },
        { new: true }
      );

      const receiverData = await redis.get(`user-${receiverId}`);
      let receiverSocketId: string | null = null;

      if (receiverData) {
        const receiver = JSON.parse(receiverData) as Iuser;
        receiverSocketId = receiver.socketId || null;
      }

      if (receiverSocketId && isSocketConnected(io, receiverSocketId)) {
        io.to(receiverSocketId).emit("message_watched", {
          receiverId,
          message,
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log(
        `User with Id ${socket.userId} and socketId ${socket.id} disconnected`
      );
      await handleDisconnect(socket);
    });
  });

  return io;
};

const handleJoin = async (socket: CustomSocket, token: string) => {
  try {
    const user = await handleToken(token, socket.id);
    if (!user?._id) {
      socket.emit("error", { message: "Authentication failed" });
      return;
    }

    user.socketId = socket.id;
    await redis.set(`user-${user._id}`, JSON.stringify(user));
    await redis.expire(`user-${user._id}`, 900);

    socket.userId = user._id.toString();

    socket.emit("logged_success", {
      message: `User logged in _id : ${user._id}`,
    });

    console.log(`User ${user._id} logged in.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      socket.emit("error", { message: error.message });
    } else {
      socket.emit("error", { message: "Error during authentication" });
    }
    console.error("Error in join handler:", error);
  }
};

const handleSendMessage = async (
  io: SocketIOServer,
  socket: CustomSocket,
  data: IMessage | any
) => {
  try {
    const { content, receiverId } = data;
    const senderId = socket.userId;

    if (!senderId) {
      socket.emit("error", { message: "User not authenticated" });
      return;
    }

    const lastMessage = {
      content,
      sender: senderId,
      createdAt: Date.now(),
    };

    let conversation = await conversationModel
      .findOneAndUpdate(
        { participants: { $all: [receiverId, senderId] } },
        { $set: { lastMessage } },
        { new: true }
      )
      .lean();

    if (!conversation) {
      const conversationValues = {
        participants: [senderId, receiverId],
        lastMessage,
      };
      conversation = await conversationModel
        .create(conversationValues)
        .then((doc) => doc.toObject() as any);
    }

    if (!conversation) {
      throw new CustomError("server Error", 500);
    }

    const newMessage = await messageModel.create({
      conversationId: conversation._id,
      sender: senderId,
      content,
    });

    const receiverData = await redis.get(`user-${receiverId}`);
    let receiverSocketId: string | null = null;

    if (receiverData) {
      const receiver = JSON.parse(receiverData) as Iuser;
      receiverSocketId = receiver.socketId || null;
    }

    if (receiverSocketId && isSocketConnected(io, receiverSocketId)) {
      newMessage.isdelivered = true;
      const messageReturned = await messageModel
        .findByIdAndUpdate(newMessage._id, { isdelivered: true }, { new: true })
        .populate("sender", "name email image");

      io.to(receiverSocketId).emit("receive_message", messageReturned);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      socket.emit("error", { message: error.message });
    } else {
      socket.emit("error", { message: "Unknown error" });
    }
    console.error("Error in send_message handler:", error);
  }
};

const handleDisconnect = async (socket: CustomSocket) => {
  if (socket.userId) {
    const userData = await redis.get(`user-${socket.userId}`);

    if (userData) {
      const user = JSON.parse(userData) as Iuser;
      user.socketId = null;

      await redis.set(`user-${socket.userId}`, JSON.stringify(user));
      await redis.expire(`user-${socket.userId}`, 900);
    }

    console.log("Removed socketId for user:", socket.userId);
  }
  console.log("User disconnected:", socket.id);
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io instance not initialized!");
  }
  return io;
};
