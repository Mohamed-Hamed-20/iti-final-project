import { Request, Response, NextFunction } from "express";
import userModel from "../../../DB/models/user.model";
import { CustomError } from "../../../utils/errorHandling";
import bcrypt, { compare } from "bcryptjs";
import { sanatizeUser } from "../../../utils/sanatize.data";
import { TokenService } from "../../../utils/tokens";
import { TokenConfigration, SALT_ROUND } from "../../../config/env";
import emailQueue from "../../../utils/email.Queue";
import { v4 as uuidv4 } from "uuid";
import { cokkiesOptions } from "../../../utils/cookies";
import fs from "fs";
import path from "path";
import cron from "node-cron";
import { TokenExpiredError } from "jsonwebtoken";
import jwt from 'jsonwebtoken';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { firstName, lastName, email, password, role } = req.body;

  const chkemail = await userModel.findOne({ email }).select("email");
  if (chkemail) return next(new CustomError("Email Already Exists", 404));

  const hashpassword = await bcrypt.hash(password, Number(SALT_ROUND));

  // Set verification status based on role
  const verificationStatus = role === "user" ? "approved" : "none";

  const result = new userModel({
    firstName,
    lastName,
    email,
    password: hashpassword,
    role,
    verificationStatus,
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

  const link = `${req.protocol}://${req.headers.host}/api/v1/auth/confirm/email/${token}`;

  const emailTemplatePath = path.join(__dirname, "./emailTemplates/email.html");
  let emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
  emailTemplate = emailTemplate.replace("{{link}}", link);

  await emailQueue.add(
    {
      to: response.email,
      subject: "Verify your email",
      text: "Welcome to Mentora! 🎉",
      html: emailTemplate,
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
    .select(
      "firstName lastName email password role avatar isConfirmed verificationStatus following"
    )
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
    cokkiesOptions(10 * 24 * 3600000)
  );

  res.cookie("refreshToken", refreshToken, cokkiesOptions(10 * 24 * 3600000));
  return res.status(200).json({
    message: "Login successful",
    success: true,
    statusCode: 200,
    user: sanatizeUser(findUser),
  });
};

export const confirmEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    const { userId } = new TokenService(
      String(TokenConfigration.ACCESS_TOKEN_SECRET)
    ).verifyToken(token);

    if (!userId) {
      return res.sendFile(
        path.join(__dirname, "./emailTemplates/email-failed.html")
      );
    }

    const user = await userModel.findById(userId).select("isConfirmed");

    if (!user) {
      return res.sendFile(
        path.join(__dirname, "./emailTemplates/email-failed.html")
      );
    }

    // If the email is already confirmed
    if (user.isConfirmed) {
      return res.redirect("http://localhost:5173/login");
    }

    const updateUser = await userModel
      .findByIdAndUpdate(userId, { $set: { isConfirmed: true } }, { new: true })
      .select("firstName lastName email isConfirmed role")
      .lean();

    if (!updateUser) {
      return res.sendFile(
        path.join(__dirname, "./emailTemplates/email-failed.html")
      );
    }

    return res.sendFile(
      path.join(__dirname, "./emailTemplates/email-success.html")
    );
  } catch (error: any) {
    res.status(500).json({
      message: "catch error",
      error: error.message,
      stack: error.stack,
    });
  }
};

export const sendCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new CustomError("Email is required", 400));
    }

    const user = await userModel.findOne({ email }).select("email");

    if (!user) {
      return next(new CustomError("You have to register first", 404));
    }

    const generateOTP = () => {
      const uuid = uuidv4().replace(/\D/g, "").slice(0, 8);
      return uuid;
    };

    const OTPCode = generateOTP();

    await userModel.findByIdAndUpdate(user._id, {
      code: OTPCode,
      updatedAt: new Date(),
    });

    const emailTemplatePath = path.join(
      __dirname,
      "./emailTemplates/email-code.html"
    );
    let emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
    emailTemplate = emailTemplate.replace(/{{code}}/g, OTPCode);

    await emailQueue.add(
      {
        to: user.email,
        subject: "Password Reset Request",
        text: "Here is your password reset code",
        html: emailTemplate,
        message: "Mentora",
      },
      { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
    );

    return res.status(200).json({
      message: "Please check your email for a message with your code",
      success: true,
      statusCode: 200,
    });
  } catch (error) {
    return next(
      new CustomError(`Failed to send code: ${(error as Error).message}`, 500)
    );
  }
};

export const forgetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, password } = req.body;

    if (!code || code === null || code === undefined) {
      return next(new CustomError("Code is required and cannot be null", 400));
    }

    const user = await userModel.findOne({ email, code });

    if (!user) {
      return next(new CustomError("Email or code is not valid", 400));
    }

    const hashedPassword = await bcrypt.hash(password, Number(SALT_ROUND));

    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      {
        $unset: { code: "" },
        password: hashedPassword,
      },
      { new: true }
    );

    if (!updatedUser) {
      return next(new CustomError("Failed to update password", 500));
    }

    res.status(200).json({
      message: "Password changed successfully",
      success: true,
      statusCode: 200,
      user: updatedUser,
    });
  } catch (error) {
    return next(
      new CustomError(
        `Failed to reset password: ${(error as Error).message}`,
        500
      )
    );
  }
};

export const clearUnusedCodes = async () => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const result = await userModel.updateMany(
      {
        code: { $exists: true, $ne: "" },
        updatedAt: { $lte: fifteenMinutesAgo },
      },
      { $unset: { code: "" } }
    );

  } catch (error) {
    console.error("Error clearing unused codes:", error);
  }
};

// Schedule the cron job to run every 5 minutes
cron.schedule("*/5 * * * *", clearUnusedCodes);

export const generateNewAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // get tokens from cookies
  const { refreshToken, accessToken: accessTokenCookie } = req.cookies;
  if (!accessTokenCookie || !refreshToken) {
    return next(new CustomError("please login first", 400));
  }

  // extract the access token from the cookie (remove prefix if any)
  const tokenPrefix = TokenConfigration.ACCESS_TOKEN_START_WITH || "Bearer ";
  let accessToken: string;
  try {
    const parts = accessTokenCookie.split(tokenPrefix);
    if (parts.length < 2) {
      return next(new CustomError("invalid access token format", 400));
    }
    accessToken = parts[1];
  } catch (error) {
    return next(new CustomError("error parsing access token", 400));
  }

  // verify if the access token is expired
  try {
    const decoded = new TokenService(
      String(TokenConfigration.ACCESS_TOKEN_SECRET)
    ).verifyToken(accessToken);
    // if token is still valid, no need to refresh
    if (decoded && decoded.userId) {
      return next(new CustomError("access token is still valid", 400));
    }
  } catch (error) {
    // if error is not token expired error, reject request
    if (!(error instanceof TokenExpiredError)) {
      return next(
        new CustomError(
          `invalid access token: ${(error as Error).message}`,
          400
        )
      );
    }
    // else, token is expired, so we continue
  }

  // refresh the token using the refresh token
  try {
    const decodedRefresh = new TokenService(
      String(TokenConfigration.REFRESH_TOKEN_SECRET)
    ).verifyToken(refreshToken);
    if (!decodedRefresh || !decodedRefresh.userId) {
      return next(new CustomError("invalid refresh token", 400));
    }

    // find user in db
    const user = await userModel.findById(decodedRefresh.userId).lean();
    if (!user) {
      return next(new CustomError("user not found, please login again", 400));
    }

    // generate new access token
    const newAccessToken = new TokenService(
      String(TokenConfigration.ACCESS_TOKEN_SECRET),
      String(TokenConfigration.ACCESS_EXPIRE)
    ).generateToken({
      userId: user._id,
      role: user.role,
    });

    // generate new refresh token (token rotation)
    const newRefreshToken = new TokenService(
      String(TokenConfigration.REFRESH_TOKEN_SECRET),
      String(TokenConfigration.REFRESH_EXPIRE)
    ).generateToken({
      userId: user._id,
      role: user.role,
    });

    // set new tokens in cookies; cookie expiry here is set longer (e.g., same as refresh token)
    res.cookie(
      "accessToken",
      `${process.env.ACCESS_TOKEN_START_WITH || "Bearer "}${newAccessToken}`,
      cokkiesOptions(10 * 24 * 3600000) // cookie expires in 7 days
    );
    res.cookie(
      "refreshToken",
      newRefreshToken,
      cokkiesOptions(10 * 24 * 3600000)
    );

    // send the new access token in the response
    return res.status(200).json({
      messgae: "Token refreshed successfully",
      success: true,
      statsuCode: 200,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(
      new CustomError(`token refresh error: ${(error as Error).message}`, 400)
    );
  }
};

export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
    // Get tokens from cookies
    const accessToken = req.cookies?.accessToken?.replace(
      `${process.env.ACCESS_TOKEN_START_WITH}`,
      ''
    );
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken || !refreshToken) {
      return next(new CustomError('Authentication required', 401));
    }

    // Verify access token first
    let decoded: any;
    try {
      decoded = jwt.verify(
        accessToken,
        String(process.env.ACCESS_TOKEN_SECRET)
      );
    } catch (accessError) {
      // If access token expired, try refresh token
      if (accessError instanceof jwt.TokenExpiredError) {
        try {
          decoded = jwt.verify(
            refreshToken,
            String(process.env.REFRESH_TOKEN_SECRET)
          );
          
          // Generate new access token
          const newAccessToken = new TokenService(
            String(process.env.ACCESS_TOKEN_SECRET),
            String(process.env.ACCESS_EXPIRE)
          ).generateToken({
            userId: decoded.userId,
            role: decoded.role
          });

          // Set new access token in cookie
          res.cookie(
            'accessToken',
            `${process.env.ACCESS_TOKEN_START_WITH}${newAccessToken}`,
            cokkiesOptions(10 * 24 * 3600000)
          );
        } catch (refreshError) {
          return next(new CustomError('Session expired, please login again', 401));
        }
      } else {
        return next(new CustomError('Invalid token', 401));
      }
    }

    // Find user in database
    const user = await userModel
      .findById(decoded.userId)
      .select('firstName lastName email role avatar isConfirmed verificationStatus')
      .lean();

    if (!user) {
      return next(new CustomError('User not found', 404));
    }

    // Check if user is confirmed
    if (!user.isConfirmed) {
      return next(new CustomError('Please confirm your email', 403));
    }

    return res.status(200).json({
      message: 'Authenticated',
      success: true,
      statusCode: 200,
      user: sanatizeUser(user),
    });

};