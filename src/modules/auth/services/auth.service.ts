import { Types } from "mongoose";

import { Request, Response, NextFunction } from "express";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import bcrypt from "bcryptjs";
import { encrypt } from "../../../utils/crpto";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { TokenService } from "../../../utils/tokens";
import { TokenConfigration } from "../../../config/env";
import emailQueue from "../../../utils/email.Queue";
import { SignUpTemplet } from "../../../utils/htmlTemplet";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { name, email, password, age, phone } = req.body;

  const chkemail = await userModel.findOne({ email }).select("email");
  if (chkemail) return next(new CustomError("Email is Already Exist", 404));

  const hashpassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUND)
  );
  const encryptPhone = phone
    ? encrypt(phone, String(process.env.SECRETKEY_CRYPTO))
    : undefined;

  const result = new userModel({
    name,
    email,
    password: hashpassword,
    age,
    phone: encryptPhone,
  });

  const response = await result.save();
  if (!result) return next(new CustomError("Something went wrong!", 500));


  const token = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET),
    "20m"
  ).generateToken({
    userId: response._id,
    role: response.role,
  });

  await emailQueue.add(
    {
      to: response.email,
      subject: "message to confirm your Email",
      text: "Welcome to Out courses App! 🎉",
      html: SignUpTemplet(
        `${req.protocol}://${req.headers.host}/api/v1/auth/confirm/${token}/email`
      ),
      message: "Please confirm ur email",
    },
    { attempts: 3, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );

  return res.status(201).json({
    message: "user Data Added successfully",
    user: sanatizeUser(response),
  });
};
