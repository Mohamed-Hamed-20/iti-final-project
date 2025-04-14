import Joi from "joi";

export const addJobSchema = {
  body: Joi.object({
    title: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.empty": "Job title is required",
        "string.min": "Job title must be at least 2 characters long",
        "string.max": "Job title must be at most 100 characters long",
        "string.pattern.base": "Job title must contain only letters and spaces",
      }),
  }),
};

export const updateJobSchema = {
  body: Joi.object({
    title: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[A-Za-z\s]+$/)
      .required()
      .messages({
        "string.empty": "Job title is required",
        "string.min": "Job title must be at least 2 characters long",
        "string.max": "Job title must be at most 100 characters long",
        "string.pattern.base": "Job title must contain only letters and spaces",
      }),
  }),
};

