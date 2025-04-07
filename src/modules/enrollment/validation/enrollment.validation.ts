import joi from "joi";
import { generalFields } from "../../../middleware/validation";

export const createEnrollmentSchema = {
  body: joi
    .object({
      courseId: generalFields._id.required(),
    })
    .required(),
};

export const updateEnrollmentSchema = {
  body: joi
    .object({
      progress: joi.number().min(0).max(100).optional(),
      status: joi.string().valid('active', 'completed', 'cancelled').optional(),
    })
    .required(),
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
}; 