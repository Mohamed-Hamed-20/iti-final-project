import { CustomError } from "./../../../utils/errorHandling";
import { NextFunction, Request, Response } from "express";
import { sanatizeUser } from "../../../utils/sanatize.data";
import userModel from "../../../DB/models/user.model";

export const profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  try {
    const user = req.user; 
    if (!user) {
      return next(new CustomError("user not found ERROR", 500));
    }
    
    return res.status(200).json({
      message: "user data fetched successfully",
      statusCode: 200,
      success: true,
      user: sanatizeUser(user),
    });
  } catch (error) {
    next(
      new CustomError(
        `Failed to fetch user profile: ${(error as Error).message}`,
        500
      )
    );
  }
};
export const instructors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const users = await userModel
      .find({ role: "instructor" })
      .select("-password")
      .populate("courses") 
      .lean();

    return res.status(200).json({
      message: "All instructors",
      status: "success",
      data: users,
    });
  } catch (error) {
    next(
      new CustomError(
        `Failed to fetch instructors: ${(error as Error).message}`,
        500
      )
    );
  }
};

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      next(new CustomError("No file uploaded", 400));
      return;
    }

    const imagePath = req.file.path;

    const userId = req.user?._id;
    if (!userId) {
      next(new CustomError("Unauthorized", 401));
      return;
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      { avatar: imagePath },
      { new: true }
    );

    if (!user) {
      next(new CustomError("User not found", 404));
      return;
    }

    res.status(200).json({
      message: "Image uploaded successfully",
      statusCode: 200,
      success: true,
      imagePath: user.avatar,
    });
  } catch (error) {
    next(
      new CustomError(
        `Failed to add image: ${(error as Error).message}`,
        500
      )
    );
  }
};




