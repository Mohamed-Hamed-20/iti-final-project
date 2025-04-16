import jwt, { JsonWebTokenError, JwtPayload, Secret } from "jsonwebtoken";
import mongoose from "mongoose";
import { CustomError } from "./errorHandling";
import { NODE_ENV } from "../config/env";

type Payload = {
  userId?: mongoose.Types.ObjectId | any;
  enrollmentId?: mongoose.Types.ObjectId | any;
  courseId?: mongoose.Types.ObjectId | any;
  courseIds?: mongoose.Types.ObjectId[] | any;
  role?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
  sub?: string;
  isCartOrder?: boolean;
  cartCourses?: mongoose.Types.ObjectId[] | any;
  cartId?: mongoose.Types.ObjectId | any;
  data?: any;
};

export class TokenService {
  private secretKey: string;
  private expiresIn: string | Number | any;

  constructor(secretKey: string, expiresIn: string = "1h") {
    if (!secretKey) {
      throw new CustomError("Secret key is missing", 500);
    }
    this.secretKey = secretKey;
    this.expiresIn = expiresIn;
  }

  public generateToken(payload: Payload): string {
    try {
      const token = jwt.sign(payload, this.secretKey, {
        expiresIn: this.expiresIn,
        audience: String(process.env.app_url),
        issuer: String(process.env.companyName),
        subject: String(process.env.Email || "mohamed@gmail.com"),
      });

      if (!token) throw new Error("Token generation failed");

      return token;
    } catch (error: unknown) {
      throw new CustomError(
        `Token generation failed: ${(error as Error).message}`,
        500
      );
    }
  }

  public verifyToken(token: string): Payload {
    try {
      const payload = jwt.verify(token, this.secretKey) as Payload;
      if (!payload) {
        throw new CustomError("Token verification failed: Invalid token", 400);
      }
      return payload;
    } catch (error: unknown) {
      throw error;
    }
  }
}
