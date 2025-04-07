import joi from "joi";
import { generalFields } from "../../../middleware/validation";

export const createReviewSchema = {
  body: joi
    .object({
      referenceId: generalFields._id.required(),
      referenceType: joi
        .string()
        .valid('course', 'instructor')
        .required()
        .messages({
          'string.empty': 'Reference type is required',
          'any.required': 'Reference type is required',
          'any.only': 'Reference type must be either course or instructor'
        }),
      rating: joi
        .number()
        .min(1)
        .max(5)
        .required()
        .messages({
          'number.base': 'Rating must be a number',
          'number.min': 'Rating must be at least 1',
          'number.max': 'Rating cannot be more than 5',
          'any.required': 'Rating is required'
        }),
      comment: joi
        .string()
        .min(3)
        .required()
        .messages({
          'string.empty': 'Review comment is required',
          'string.min': 'Comment must be at least 3 characters long',
          'any.required': 'Review comment is required'
        })
    })
    .required()
};

export const updateReviewSchema = {
  body: joi
    .object({
      rating: joi
        .number()
        .min(1)
        .max(5)
        .messages({
          'number.base': 'Rating must be a number',
          'number.min': 'Rating must be at least 1',
          'number.max': 'Rating cannot be more than 5'
        }),
      comment: joi
        .string()
        .min(3)
        .messages({
          'string.min': 'Comment must be at least 3 characters long'
        })
    })
    .required()
};

export const reviewIdSchema = {
  params: joi
    .object({
      id: generalFields._id.required()
    })
    .required()
};

export const reviewStatsSchema = {
  params: joi
    .object({
      referenceId: generalFields._id.required(),
      referenceType: joi
        .string()
        .valid('course', 'instructor')
        .required()
    })
    .required()
}; 