import joi from "joi";
import { generalFields } from "../../../middleware/validation";

export const createReviewSchema = {
  body: joi
    .object({
      instructorId: generalFields._id.required(),
      referenceType: joi.string().trim().valid("instructor").required(),
      rating: joi.number().min(1).max(5).required(),
      comment: joi.string().trim().min(3).max(4000).required(),
    })
    .required(),
};

export const createReviewForCourseSchema = {
  body: joi
    .object({
      courseId: generalFields._id.required(),
      referenceType: joi.string().trim().valid("course").required(),
      rating: joi.number().min(1).max(5).required(),
      comment: joi.string().trim().min(3).max(4000).required(),
    })
    .required(),
};

export const updateReviewSchema = {
  body: joi
    .object({
      rating: joi.number().min(1).max(5),
      comment: joi.string().min(3).max(1000),
    })
    .required(),
};

export const reviewIdSchema = {
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};

export const updateReviewForCourseSchema = {
  body: joi
    .object({
      referenceType: joi.string().valid("course").required(),
      rating: joi.number().min(1).max(5),
      comment: joi.string().min(3).max(1000),
    })
    .required(),

  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};

export const updateReviewForInstructorSchema = {
  body: joi
    .object({
      referenceType: joi.string().valid("instructor").required(),
      rating: joi.number().min(1).max(5),
      comment: joi.string().min(3).max(1000),
    })
    .required(),

  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};
export const getReviewStatsSchema = {
  params: joi
    .object({
      referenceType: joi.string().valid("course", "instructor").required(),
      referenceId: generalFields._id.required(),
    })
    .required(),
};
