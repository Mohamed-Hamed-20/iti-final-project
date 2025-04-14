import joi from "joi";
import { generalFields } from "../../middleware/validation";

export const changePassSchema = {
  body: joi
    .object({
      currentPassword: generalFields.password.required(),
      newPassword: generalFields.password.required(),
    })
    .required(),
};

export const instructorIdSchema = {
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};

export const instructorsserchSchema = {
  query: joi
    .object({
      page: generalFields.page,
      size: generalFields.size,
      select: generalFields.select,
      search: generalFields.search,
      sort: generalFields.sort,
      values: joi
        .alternatives()
        .try(joi.string(), joi.array().items(joi.string()))
        .optional()
        .custom((value) => [].concat(value), "Convert single value to array"),
    })
    .required(),
};

export const updateProfileSchema = {
  body: joi
    .object({
      firstName: joi.string().trim().min(3).max(33).pattern(/^[A-Za-z]+$/).required(),
      lastName: joi.string().trim().min(3).max(33).pattern(/^[A-Za-z]+$/).required(),
      phone: joi.string().trim().pattern(/^\+?[1-9]\d{7,14}$/).optional(),
    })
    .required(),
};

export const instructorDataSchema = {
  body: joi.object({
    firstName: joi.string()
      .trim()
      .min(3)
      .max(33)
      .pattern(/^[A-Za-z]+$/)
      .required()
      .messages({
        "string.empty": "First name is required",
        "string.min": "First name must be at least 3 characters",
        "string.max": "First name must be at most 33 characters",
        "string.pattern.base": "First name must contain only letters",
      }),

    lastName: joi.string()
      .trim()
      .min(3)
      .max(33)
      .pattern(/^[A-Za-z]+$/)
      .required()
      .messages({
        "string.empty": "Last name is required",
        "string.min": "Last name must be at least 3 characters",
        "string.max": "Last name must be at most 33 characters",
        "string.pattern.base": "Last name must contain only letters",
      }),

    phone: joi.string()
      .trim()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .messages({
        "string.pattern.base": "Phone number must be in E.164 format (e.g. +1234567890)",
      }),

    jobTitle: joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        "string.min": "Job title must be at least 2 characters",
        "string.max": "Job title must be at most 100 characters",
      }),

    socialLinks: joi.object({
      facebook: joi.string().uri().optional(),
      linkedin: joi.string().uri().optional(),
      twitter: joi.string().uri().optional(),
      github: joi.string().uri().optional(),
      website: joi.string().uri().optional(),
    }).optional(),

    bio: joi.string()
      .trim()
      .min(5)
      .max(1000)
      .allow("", null)
      .messages({
        "string.min": "Bio must be at least 5 characters",
        "string.max": "Bio must be at most 1000 characters",
      }),
  }),
};
