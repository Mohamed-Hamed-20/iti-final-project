import userModel from "../../../DB/model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../services/email.js";
import { asyncHandler } from "../../../services/asyncHandler.js";
import {
  findOne,
  findOneAndUpdate,
  findByIdAndUpdate,
} from "../../../DB/DBMethods.js";
import { customAlphabet } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import redis from "../../../DB/redis.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const user = await findOne({
      model: userModel,
      condition: { email },
      select: "email",
    });
    if (user) {
      next(new Error("This email already registered", { cause: 409 }));
    } else {
      let hashedPassword = bcrypt.hashSync(
        password,
        parseInt(process.env.SALTROUND)
      );
      let addUser = new userModel({
        name,
        email,
        password: hashedPassword,
        phone,
      });

      let token = jwt.sign(
        { id: addUser._id, isLoggedIn: true },
        process.env.emailToken,
        { expiresIn: 60 * 60 }
      );
      let link = `${req.protocol}://${req.headers.host}${process.env.BASEURL}/auth/confirmEmail/${token}`;
      let emailTemplatePath = path.join(
        __dirname,
        "./emailTemplates/email.html"
      );
      let emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
      emailTemplate = emailTemplate.replace("{{link}}", link);
      let result = await sendEmail(email, "Verify Your Email", emailTemplate);

      if (result.accepted.length) {
        let savedUser = await addUser.save();
        res.status(201).json({ message: "Success" });
      } else {
        next(new Error("Invalid email", { cause: 404 }));
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "catch error",
      error: error.message,
      stack: error.stack,
    });
  }
};
export const confirmEmail = async (req, res, next) => {
  try {
    let { token } = req.params;
    let decoded = jwt.verify(token, process.env.emailToken);
    if (!decoded && !decoded.id) {
      return res.sendFile(
        path.join(__dirname, "./emailTemplates/email-failed.html")
      );
    } else {
      let updatedUser = await findOneAndUpdate({
        model: userModel,
        condition: { _id: decoded.id, confirmEmail: false },
        data: { confirmEmail: true },
        options: { new: true },
      });
      if (updatedUser) {
        return res.sendFile(
          path.join(__dirname, "./emailTemplates/email-success.html")
        );
      } else {
        return res.redirect("http://localhost:5173/login");
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "catch error",
      error: error.message,
      stack: error.stack,
    });
  }
};
export const logIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await findOne({
    model: userModel,
    condition: { email },
  });
  if (!user) {
    next(new Error("You have to register first", { cause: 404 }));
  } else {
    let matched = bcrypt.compareSync(
      password,
      user.password,
      parseInt(process.env.SALTROUND)
    );
    if (matched) {
      if (!user.confirmEmail) {
        next(new Error("You have to confirm ur email first", { cause: 400 }));
      } else {
        let token = jwt.sign(
          { id: user._id, isLoggedIn: true, role:user.role },
          process.env.tokenSignature,
          { expiresIn: 60 * 60 * 60 * 24 * 2 }
        );

        await redis.set(`user-${user._id}`, JSON.stringify(user.toObject()));
        await redis.expire(`user-${user._id}`, 900);

        res
          .status(200)
          .json({
            message: "Success",
            token,
            userId: user._id,
            userRole: user.role,
            image: user.image || "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg"
          });
      }
    } else {
      next(new Error("Password don't match", { cause: 400 }));
    }
  }
});

export const sendCode = asyncHandler(async (req, res, next) => {
  let { email } = req.body;
  let user = await findOne({
    model: userModel,
    condition: { email },
    select: "email",
  });
  if (!user) {
    next(new Error("You have to register first", { cause: 404 }));
  } else {
    const generateOTP = customAlphabet("1234567890", 8);
    let OTPCode = generateOTP();
    await findByIdAndUpdate({
      model: userModel,
      condition: { _id: user._id },
      data: { code: OTPCode },
    });
    let emailTemplatePath = path.join(
      __dirname,
      "./emailTemplates/email-code.html"
    );
    let emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");
    emailTemplate = emailTemplate.replace(/{{code}}/g, OTPCode);
    console.log("Generated OTP:", OTPCode);
    console.log("Email Template After Replacement:", emailTemplate);
    let result = await sendEmail(
      email,
      "Password Reset Request",
      emailTemplate
    );
    res.json({
      message: "Please check your email for a message with your code",
    });
  }
});
export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email, code, password } = req.body;
  if (!code) {
    next(new Error(" code is not valid", { cause: 400 }));
  } else {
    const user = await findOne({
      model: userModel,
      condition: { email, code },
    });
    if (!user) {
      next(new Error("Email or code is not valid", { cause: 400 }));
    } else {
      let hashedPassword = bcrypt.hashSync(
        password,
        parseInt(process.env.SALTROUND)
      );
      let updated = await findByIdAndUpdate({
        model: userModel,
        condition: { _id: user._id },
        data: { code: null, password: hashedPassword },
        options: { new: true },
      });
      res.json({ message: "password changed successfully", updated });
    }
  }
});
