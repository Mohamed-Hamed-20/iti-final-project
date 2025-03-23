import { PipelineStage, Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import courseModel from "../../../DB/models/courses.model";
import { CustomError } from "../../../utils/errorHandling";
import { sectionModel } from "../../../DB/models/videos.model";
import ApiPipeline from "../../../utils/apiFeacture";
const allowFieldsSection = [
  "title",
  "order",
  "courseId",
  "courseId.title",
  "courseId.instructorId",
  "courseId.thumbnail",
  "courseId.price",
];
export const addsection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, courseId, order , sectionId } = req.body;
  const user = req.user;

  const course = await courseModel.findById(courseId);

  if (!course) {
    return next(new CustomError("Course not found", 404));
  }

  if (course.instructorId.toString() !== user?._id.toString()) {
    return next(
      new CustomError("You are not allowed to add section to this course", 403)
    );
  }

  const section = await sectionModel.create({ title, courseId, order });

  return res.status(201).json({
    message: "Section created successfully",
    section,
  });
};

export const getSection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { sectionId } = req.params;
  const section = await sectionModel.findById(sectionId);

  if (!section) {
    return next(new CustomError("Section not found", 404));
  }

  return res.status(200).json({
    message: "Sections fetched successfully",
    section,
  });
};

export const searchSectionBycourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { courseId } = req.query;
  const { page, size, select, search, sort } = req.query;
  const pipeline: PipelineStage[] = new ApiPipeline()
    .matchId({
      Id: courseId as unknown as Types.ObjectId,
      field: "courseId",
    })
    .paginate(Number(page), Number(size))
    .lookUp({
      as: "videos",
      from: "video",
      localField: "_id",
      foreignField: "sectionId",
    })
    .projection({
      select: select as string,
      allowFields: allowFieldsSection,
      defaultFields: ["title", "order", "courseId"],
    })
    .build();

  const sections = await sectionModel.aggregate(pipeline);

  return res.status(200).json({
    message: "Sections fetched successfully",
    sections,
  });
};
