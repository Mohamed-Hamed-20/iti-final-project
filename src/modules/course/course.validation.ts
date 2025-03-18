import joi from "joi";
import { generalFields } from "../../middleware/validation";

// Validation Schema for Adding a Course
export const addCourseSchema = {
  body: joi
    .object({
      title: joi.string().trim().min(3).max(100).required(),
      description: joi.string().trim().allow(null, ""),
      price: joi.number().min(0).required(),
      access_type: joi.string().valid("free", "paid", "prime").required(),
      categoryId: joi.string().required(),
    })
    .required(),
};

// Validation Schema for Updating a Course
export const updateCourseSchema = {
  body: joi
    .object({
      title: joi.string().trim().min(3).max(100),
      description: joi.string().trim().allow(null, ""),
      price: joi.number().min(0),
      thumbnail: joi.string().trim().uri(),
      access_type: joi.string().valid("free", "paid", "prime"),
      instructorId: joi.string(),
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
