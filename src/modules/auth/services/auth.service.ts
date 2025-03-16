import { Request, Response, NextFunction } from "express";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import bcrypt, { compare } from "bcryptjs";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { TokenService } from "../../../utils/tokens";
import { TokenConfigration, FRONTEND, SALT_ROUND } from "../../../config/env";
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

  const hashpassword = await bcrypt.hash(password, Number(SALT_ROUND));

  const result = new userModel({
    firstName,
    lastName,
    email,
    password: hashpassword,
    role
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
  console.log(`${FRONTEND.BASE_URL}${FRONTEND.CONFIRM_EMAIL}/${token}`);

  await emailQueue.add(
    {
      to: response.email,
      subject: "Verify your email",
      text: "Welcome to Out courses App! 🎉",
      html: SignUpTemplet(
        `${FRONTEND.BASE_URL}${FRONTEND.CONFIRM_EMAIL}/${token}`
      ),
      message: "Mentora",
    },
    { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );

  return res.status(201).json({
    message: "Please check your email for verification",
    success: true,
    statusCode: 201,
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
    .select("firstName lastName email password role avatar isConfirmed")
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
  return res.status(200).json({
    message: "Login successful",
    success: true,
    statusCode: 200,
    user: sanatizeUser(findUser),
  });
};

export const sendForgetPasswordEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { email } = req.body;

  const user = await userModel
    .findOne({ email })
    .select("firstName lastName email")
    .lean();


  if (!user) return next(new CustomError("user not found :-(!", 404));

  const token = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET),
    TokenConfigration.ACCESS_EXPIRE
  ).generateToken({ userId: user?._id, role: user?.role });

  // ${FRONTEND.BASE_URL}/${FRONTEND.RESET_PASSWORD_URL} ==> in SignUpTemplet

  await emailQueue.add(
    {
      to: user?.email,
      subject: "this message to Reset your Password",
      text: "Welcome to Out courses App! 🎉",
      html: SignUpTemplet(
        `${FRONTEND.BASE_URL}/resetPassword/${token}`
      ),
      message: "Please Reset ur Password",
    },
    { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );

  return res.status(200).json({
    message: "Reset Password Email Send Successfully",
    success: true,
    statusCode: 200,
    user: sanatizeUser(user),
  });
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {token} = req.params;
  const { password } = req.body;
  const { userId } = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET)
  ).verifyToken(token);
  const passwordHash = await bcrypt.hash(password, Number(SALT_ROUND));
  const updateUser = await userModel
    .findByIdAndUpdate(
      { _id: userId },
      { $set: { password: passwordHash } },
      { new: true }
    )
    .lean();

  if (!updateUser) {
    return next(new CustomError("user Not found Update password faild", 400));
  }

  return res.status(200).json({
    message: "password reset successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(updateUser),
  });
};

export const confirmEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.params;

  const { userId } = new TokenService(
    String(TokenConfigration.ACCESS_TOKEN_SECRET)
  ).verifyToken(token);

  const updateUser = await userModel
    .findByIdAndUpdate(
      { _id: userId },
      { $set: { isConfirmed: true } },
      { new: true }
    )
    .select("firstName lastName email isConfirmed role")
    .lean();

  if (!updateUser) {
    return next(new CustomError("Falid to confirm Your Email :-(", 404));
  }

  return res.status(200).json({
    message: "Email Confirmed successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(updateUser),
  });
};
