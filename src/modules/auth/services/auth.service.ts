import { Types } from "mongoose";

import { Request, Response, NextFunction } from "express";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import bcrypt, { compare } from "bcryptjs";
import { encrypt } from "../../../utils/crpto";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { TokenService } from "../../../utils/tokens";
import { TokenConfigration } from "../../../config/env";
import emailQueue from "../../../utils/email.Queue";
import { SignUpTemplet } from "../../../utils/htmlTemplet";
import { cokkiesOptions } from "../../../utils/cookies";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { firstName, lastName, email, password, role } = req.body;

  const chkemail = await userModel.findOne({ email }).select("email");
  if (chkemail) return next(new CustomError("Email is Already Exist", 404));

  const hashpassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUND)
  );

  const result = new userModel({
    firstName,
    lastName,
    email,
    password: hashpassword,
  });

  const response = await result.save();
  if (!response) return next(new CustomError("Something went wrong!", 500));

  const token = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET),
    String(TokenConfigration.ACCESS_EXPIRE)
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

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { email, password } = req.body;

  const findUser = await userModel
    .findOne({ email })
    .select("firstName lastName email password role avatar isConfirmed ")
    .lean();

  if (!findUser) return next(new CustomError("Invalid Email or Password", 404));

  const chkPassword: boolean = await compare(
    password,
    String(findUser.password)
  );

  if (!chkPassword)
    return next(new CustomError("Invalid Email or Password", 404));

  if (findUser.isConfirmed == false) {
    return next(new CustomError("Please confirm your Email", 400));
  }
  // access Token
  const accessToken = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET),
    String(TokenConfigration.ACCESS_EXPIRE)
  ).generateToken({
    userId: findUser._id,
    role: findUser.role,
  });

  // Refresh Token
  const refreshToken = new TokenService(
    String(TokenConfigration.REFRESH_TOKEN_SECRET),
    String(TokenConfigration.REFRESH_EXPIRE)
  ).generateToken({
    userId: findUser._id,
    role: findUser.role,
  });

  res.cookie(
    "accessToken",
    `${process.env.ACCESS_TOKEN_START_WITH}${accessToken}`,
    cokkiesOptions(3600000)
  );

  res.cookie("refreshToken", refreshToken, cokkiesOptions(7 * 24 * 3600000));
  return res
    .status(200)
    .json({ message: "Login successful", user: sanatizeUser(findUser) });
};
