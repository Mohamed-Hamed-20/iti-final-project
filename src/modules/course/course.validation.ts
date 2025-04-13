import joi from "joi";
import { generalFields } from "../../middleware/validation";

// Validation Schema for Adding a Course
export const addCourseSchema = {
  body: joi
    .object({
      title: joi.string().trim().min(3).max(200).required(),
      subTitle: joi.string().trim().min(3).max(250).optional(),
      description: joi.string().trim().min(3).max(5000).allow(null, ""),
      price: joi
        .number()
        .min(0)
        .max(100000)
        .when("access_type", {
          is: "free",
          then: joi.valid(0).required(),
          otherwise: joi.number().min(1).required(),
        })
        .required(),
      access_type: joi.string().valid("free", "paid").required(),
      level: joi
        .string()
        .valid("beginner", "intermediate", "advanced")
        .required(),
      categoryId: generalFields._id.required(),
      requirements: joi
        .array()
        .items(joi.string().trim().min(2).max(400))
        .min(1)
        .max(20)
        .required(),
      learningPoints: joi
        .array()
        .items(joi.string().trim().min(2).max(400))
        .min(1)
        .max(20)
        .required(),
    })
    .required(),
};

// Validation Schema for Updating a Course
export const updateCourseSchema = {
  body: joi
    .object({
      title: joi.string().trim().min(3).max(200),
      subTitle: joi.string().trim().min(3).max(250).optional(),
      description: joi.string().trim().min(3).max(5000).allow(null, ""),
      price: joi
        .number()
        .min(0)
        .max(100000)
        .when("access_type", {
          is: "free",
          then: joi.valid(0).required(),
          otherwise: joi.number().min(1).required(),
        }),
      access_type: joi.string().valid("free", "paid"),
      categoryId: generalFields._id,
      requirements: joi
        .array()
        .items(joi.string().trim().min(1).max(400))
        .min(1)
        .max(20),
      learningPoints: joi
        .array()
        .items(joi.string().trim().min(1).max(400))
        .min(1)
        .max(20),
      level: joi
        .string()
        .valid("beginner", "intermediate", "advanced")
        .optional(),
    })
    .required(),
};

export const searchCoursesScheam = {
  query: joi
    .object({
      page: generalFields.page,
      size: generalFields.size,
      select: generalFields.select,
      search: generalFields.search,
      sort: generalFields.sort,
      ids: joi
        .alternatives()
        .try(generalFields._id, joi.array().items(generalFields._id))
        .optional()
        .custom((value) => [].concat(value), "Convert single value to array"),
    })
    .required(),
};

export const idsSchema = {
  params: joi
    .object({
      ids: joi.array().items(generalFields._id).optional(),
    })
    .required(),
};

export const searchCoursesInstructorScheam = {
  query: joi
    .object({
      page: generalFields.page,
      size: generalFields.size,
      select: generalFields.select,
      search: generalFields.search,
      access_type: joi.string().valid("free", "paid").optional(),
    })
    .required(),
};

export const getCourseByIdSchema = {
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};
