import { Document, Types } from "mongoose";

export interface ISocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  facebook?: string;
  portfolio?: string;
}

export enum Roles {
  User = "user",
  Admin = "admin",
  Instructor = "instructor",
}

export interface Iuser extends Document {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  age?: number;
  phone?: string;
  role?: Roles;
  isConfirmed?: boolean;
  isOnline?: boolean;
  avatar?: string;
  bio?: string;
  frontId?: string;
  backId?: string;
  rejectionReason?: string;
  requiredVideo?: string;
  optionalVideo?: string;
  jobTitle?: string;
  code?: number;
  verificationStatus: "pending" | "approved" | "rejected" | "none";
  socialLinks?: ISocialLinks;
  url?: string;
  socketId?: string | null;
}
