import { CustomError } from "./../../../utils/errorHandling";
import { NextFunction, Request, Response } from "express";
import { sanatizeUser } from "../../../utils/sanatize.data";

export const profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const user = req.user;
  if (!user) {
    return next(new CustomError("user not found ERROR", 500));
  }
  return res.status(200).json({
    message: "user Data fetced successfully",
    statusCode: 200,
    success: true,
    user: sanatizeUser(user),
  });
};
