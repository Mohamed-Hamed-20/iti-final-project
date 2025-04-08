import userModel from "../DB/models/user.model";
import redis from "./redis";
import { TokenConfigration } from "../config/env";
import { TokenService } from "./tokens";
import { Iuser } from "../DB/interfaces/user.interface";


const handleToken = async (token: string, socketId: string): Promise<Iuser> => {
  try {
    const decoded = new TokenService(
      TokenConfigration.ACCESS_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!decoded?.userId || !decoded.role) {
      throw new Error("Invalid token payload");
    }

    let userData = await redis.get(`user-${decoded.userId}`);
    let user: Iuser | null;

    if (userData) {
      user = JSON.parse(userData);
    } else {
      user = await userModel
        .findById(decoded.userId)
        .select("-password -confirmEmail -wishlist")
        .lean<Iuser>()
        .exec();

      if (!user) {
        throw new Error("User not found");
      }
    }

    if (!user) {
      throw new Error("User not found");
    }

    user.socketId = socketId;

    await redis.set(`user-${user._id}`, JSON.stringify(user));
    await redis.expire(`user-${user._id}`, 900); // 15 minutes

    return user;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Auth error:", error.message);
    } else {
      console.error("Auth error: unknown error");
    }

    throw new Error("Authentication failed");
  }
};

export default handleToken;
