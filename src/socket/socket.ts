import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import handleToken from "../utils/hadleToken";
import { TokenService } from "../utils/tokens";
import { TokenConfigration } from "../config/env";
import cookie from "cookie";

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

    ioInstance.on("connection", (socket: Socket) => {
      this.handleDefaultEvents(socket);
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

  private static handleDefaultEvents(socket: Socket) {
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      this.connectedSockets.delete(socket.id);
    });
  }

  static emitToUser(conversationId: string, event: string, data: any) {
    const room = this.io.sockets.adapter.rooms.get(
      `conversation-${conversationId}`
    );
    if (room && room.size > 0) {
      this.io.to(`conversation-${conversationId}`).emit(event, data);
    } else {
      console.log(
        `User ${conversationId} not in conversation, event "${event}" not emitted.`
      );
    }
  }

  static broadcastExceptUser(conversationId: string, event: string, data: any) {
    const targetRoom = `conversation-${conversationId}`;
    this.io.except(targetRoom).emit(event, data);
  }

  static extractUserIdFromSocket(socket: Socket): string | null {
    let token: string | undefined;

    if (socket.handshake.headers.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies.accessToken;
    }

    if (!token && socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      return null;
    }

    try {
      const decoded = new TokenService(
        TokenConfigration.ACCESS_TOKEN_SECRET as string
      ).verifyToken(token as string);

      return decoded.userId;
    } catch {
      return null;
    }
  }
}

export default SocketManager;
