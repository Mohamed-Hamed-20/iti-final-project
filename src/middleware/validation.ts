import joi, { Schema } from "joi";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { Types, isValidObjectId } from "mongoose";

type ReqKey = "body" | "params" | "query" | "headers" | "cookies";
const req_FE: Array<ReqKey> = ["body", "params", "query", "headers", "cookies"];

export const valid = (schema: Record<ReqKey, Schema> | any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: Array<any> = [];

    req_FE.forEach((key: ReqKey) => {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false,
        });

        if (error) {
          error.details.forEach((errorDetail: any) => {
            validationErrors.push({
              message: errorDetail.message.replace(/\"/g, ""),
              path: errorDetail?.path[0],
              label: errorDetail.context?.label,
              type: errorDetail.type,
            });
          });
        }

        if (!error && req[key]) {
          req[key] = value;
        }
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Validation Error",
        error_Message: validationErrors,
      });
    }

    return next();
  };
};

//============================= validatioObjectId =====================
const validateObjectId = (value: Types.ObjectId, helper: any) => {
  return isValidObjectId(value) ? value : helper.message("Invalid {#label} ");
};

export const toLowerCase = (value: string, helper: any) => {
  return value.toLowerCase();
};

// custom errors
export const customMessages = {
  "string.base": "{#label} must be a string",
  "string.min": "{#label} must be at least {#limit} characters",
  "string.max": "{#label} must be at most {#limit} characters",
  "number.base": "{#label} must be a number",
  "number.valid": "{#label} must be one of {#valids}",
  "boolean.base": "{#label} must be a boolean True or false",
  "array.base": "{#label} must be an array",
  "array.items": "Invalid item in {#label}",
  "_id.required": "{#label} is required",
  "_id.optional": "{#label} is optional",
  "any.only": "{#label} must be {#valids}",
  "any.required": "{#label} is required",
};

//======================general Validation Fields========================
export const generalFields = {
  email: joi
    .string()
    .email({ tlds: { allow: ["com", "net", "org", "pro"] } })
    .trim()
    .messages(customMessages),

  password: joi
    .string()
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$/)
    .trim()
    .min(8)
    .max(44)
    .messages({
      "string.pattern.base":
        "Password Must be at least 8 characters , contain number and letters",
    })
    .messages(customMessages),

  _id: joi.string().trim().custom(validateObjectId).messages(customMessages),

  PhoneNumber: joi
    .string()
    .pattern(/^(01)[0-2 |5]{1}[0-9]{8}$/)
    .trim()
    .messages(customMessages)
    .messages({
      "string.pattern.base":
        "Invalid Phone Number , must contain 11 number and start with 01",
    }),

  gender: joi
    .string()
    .valid("male", "female")
    .lowercase()
    .trim()
    .messages(customMessages),

  date: joi.date().iso().messages(customMessages),

  sort: joi.string().trim().optional().messages(customMessages),
  select: joi
    .string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages(customMessages),
  page: joi.number().min(0).max(33).optional().messages(customMessages),
  size: joi.number().min(0).max(23).optional().messages(customMessages),
  search: joi.string().trim().min(0).max(100).messages(customMessages),

  file: joi.object({
    size: joi.number(),
  }),
  token: joi
    .string()
    .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
};
