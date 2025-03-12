import jwt, {
  JsonWebTokenError,
  JwtPayload,
  Secret,
} from "jsonwebtoken";
import { CustomError } from "./errorHandling";
import mongoose from "mongoose";

export const generateToken = (
  payload: JwtPayload,
  secretKey: string,
  expiresIn: string
): string | void => {
  try {

    const expiry: any = expiresIn || "1h";
    if (!secretKey) {
      throw new CustomError("Secret key is missing", 500);
    }

    const token = jwt.sign(payload, secretKey, {
      expiresIn: expiry,
      audience: String(process.env.app_url),
      issuer: String(process.env.companyName),
      subject: String(process.env.Email || "mohamed@gmail.com"),
    });

    if (!token) throw new Error("Token generation failed");

    return token;
  } catch (error: Error | JsonWebTokenError | any) {
    throw new CustomError(`Token generation failed: ${error?.message}`, 500);
  }
};

interface Payload {
  userId: mongoose.Types.ObjectId;
  role: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  sub: string;
}

export const verifyToken = (token: string, secretKey: Secret) => {
  try {
    const payload = jwt.verify(token, secretKey) as Payload;

    if (!payload) {
      throw new CustomError("Token verification failed: Invalid token", 400);
    }

    return payload;
  } catch (error: unknown) {
    throw process.env.NODE_ENV == "development"
      ? error
      : "Unknown error occurred during token verification";
  }
};
