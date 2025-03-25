import { NextFunction, Request, Response } from "express";
import courseModel from "../../../DB/models/courses.model";
import { CustomError } from "../../../utils/errorHandling";
import { sectionModel, videoModel } from "../../../DB/models/videos.model";
import { ICourse } from "../../../DB/interfaces/courses.interface";
import { Isection, IVideo } from "../../../DB/interfaces/videos.interface";
import { Types } from "mongoose";
import deleteRequestModel from "../../../DB/models/deleteRequest.model";

export const requestToDelete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { type, targetId, reason } = req.body;
  const instructorId = req.user?._id?.toString();

  const request = await deleteRequestModel.findOne({
    targetId,
    instructorId,
    status: "pending",
  });

  if (request) {
    return next(new CustomError("request is already send and it under review", 400));
  }

  let item: ICourse | Isection | IVideo | null | any = null;

  if (type === "course") {
    item = await courseModel.findById(targetId);
  } else if (type === "section") {
    item = await sectionModel
      .findById(targetId)
      .populate<{ courseId: ICourse }>({
        path: "courseId",
        select: "instructorId",
      });
  } else if (type === "video") {
    item = await videoModel.findById(targetId).populate<{ courseId: ICourse }>({
      path: "courseId",
      select: "instructorId",
    });
  } else {
    return next(
      new CustomError(
        "Invalid type. Must be 'course', 'section', or 'video'",
        400
      )
    );
  }

  if (!item) {
    return next(new CustomError(`Invalid targetId or type`, 404));
  }

  let ownerId: string | undefined;

  if (type === "course") {
    ownerId = (item as ICourse).instructorId?.toString();
  } else {
    const sectionOrVideo = item as Isection | IVideo;
    ownerId = sectionOrVideo.courseId
      ? (sectionOrVideo.courseId as unknown as ICourse).instructorId?.toString()
      : undefined;
  }

  if (!ownerId) {
    return next(
      new CustomError(`Unable to determine ownership for this ${type}`, 400)
    );
  }

  if (ownerId !== instructorId?.toString()) {
    return next(new CustomError(`Not allowed to delete this ${type}`, 403));
  }

  const deleteRequest = await deleteRequestModel.create({
    instructorId,
    type,
    targetId,
    status: "pending",
    reason,
  });

  return res.status(200).json({
    success: true,
    message: `Delete request submitted for ${type}`,
    statusCode: 200,
    deleteRequest,
  });
};

export const deleteMyrequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { requestId } = req.query;

  const request = await deleteRequestModel.findById(requestId);

  if (request?.instructorId !== req.user?._id) {
    return next(new CustomError("not allow to delete this request", 403));
  }

  const deleted = await deleteRequestModel.deleteOne({ _id: requestId });

  if (deleted.deletedCount <= 0) {
    return next(new CustomError("Internal Server Errort", 500));
  }

  return res.status(200).json({
    message: "deleted successfully",
    success: true,
    StatusCode: 200,
    request,
  });
};

export const getAllRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {};
