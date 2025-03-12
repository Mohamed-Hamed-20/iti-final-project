import { Document } from "mongoose";
import { decrypt } from "./crpto";
import _ from "lodash";

enum Roles {
  User = "user",
  Admin = "admin",
  Guest = "guest",
}

interface Iuser extends Document {
  name: string;
  email: string;
  password: string;
  age?: number;
  phone?: string;
  role: Roles;
}

export const sanatizeUser = (user: Iuser) => {
  const sanitized = {
    _id: user?._id,
    name: user.name,
    email: user?.email,
    age: user?.age,
    phone: user?.phone
      ? decrypt(String(user?.phone), String(process.env.SECRETKEY_CRYPTO))
      : undefined,
    role: user.role,
  };

  return _.omitBy(sanitized, _.isNil);
};