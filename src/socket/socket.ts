import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import handleToken from "../utils/hadleToken";
import { TokenService } from "../utils/tokens";
import { TokenConfigration } from "../config/env";
// import { parse as parseCookie } from "cookie";
import * as cookie from "cookie";
import { Types } from "mongoose";
type SocketCallback = (socket: Socket, userId: string) => void;
type SocketEventHandler = (socket: Socket, data: any, userId: string) => void;

class SocketManager {
  private static io: Server;
  private static connectedSockets = new Map<
    string,
    { socket: Socket; userId: string }
  >();

  private static connectListeners: SocketCallback[] = [];

  static initialize(ioInstance: Server) {
    this.io = ioInstance;

    ioInstance.on("connection", async (socket: Socket) => {
      console.log("Socket connected:", socket.id);
      const cookies = socket.handshake.headers.cookie;

      if (!cookies) {
        console.log("No cookies found in handshake.");
        return;
      }

      const parsedCookies = cookie.parse(cookies);
      const accessToken = parsedCookies.accessToken?.replace("Bearer ", "");

      if (!accessToken) {
        console.log("No access token found in cookies");
        return;
      }

      const userId = this.extractUserIdFromSocket(socket, accessToken);
      if (!userId) {
        console.log("No userId found in the token");
        return;
      }

      // Store socket with userId
      this.connectedSockets.set(socket.id, { socket, userId });

      // Handle conversation events
      socket.on("joinRoom", (userId: string) => {
        const roomName = `user:${userId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined room ${roomName}`);
      });

      socket.on("leaveRoom", (userId: string) => {
        const roomName = `user:${userId}`;
        socket.leave(roomName);
        console.log(`User ${userId} left ${roomName}`);
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        this.connectedSockets.delete(socket.id);
      });
    });
  }

  static onConnect(callback: SocketCallback) {
    this.connectListeners.push(callback);
  }

  static on(event: string, handler: SocketEventHandler) {
    this.connectListeners.push((socket, userId) => {
      socket.on(event, (data) => handler(socket, data, userId));
    });
  }

  static emitToUser(roomName: string, event: string, data: any) {
    console.log(`Emitting to room ${roomName}:`, { event, data });
    this.io.to(roomName).emit(event, data);
  }

  static checkRoom(roomName: string): { exists: boolean; size?: number } {
    if (this.io.sockets.adapter.rooms.has(roomName)) {
      const room = this.io.sockets.adapter.rooms.get(roomName);
      return { exists: true, size: room?.size };
    }
    return { exists: false };
  }

  static broadcastExceptUser(
    conversationId: string,
    event: string,
    data: any,
    senderSocket: Socket
  ) {
    const roomName = `conversation-${conversationId}`;
    console.log(`Broadcasting to room ${roomName} except ${senderSocket.id}:`, {
      event,
      data,
    });

    // Broadcast to all sockets in the room except the sender
    senderSocket.to(roomName).emit(event, data);
  }

  static getSocketById(userId: string | Types.ObjectId): Socket | undefined {
    return Array.from(this.connectedSockets.values()).find(
      (entry) => entry.userId === userId.toString()
    )?.socket;
  }

  static extractUserIdFromSocket(socket: Socket, token: string): string | null {
    if (!token) return null;
    try {
      const decoded = new TokenService(
        TokenConfigration.ACCESS_TOKEN_SECRET as string
      ).verifyToken(token);
      return decoded.userId;
    } catch {
      return null;
    }
  }
}

export default SocketManager;
