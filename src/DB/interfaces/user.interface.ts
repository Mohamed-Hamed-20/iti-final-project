import { Document, Types } from "mongoose";
import { Roles } from "../../middleware/auth";

export interface Iuser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  age?: number;
  phone?: string;
  role: Roles;
  isConfirmed: boolean;
  avatar?: string;
}
