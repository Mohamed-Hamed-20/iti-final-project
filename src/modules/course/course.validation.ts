import joi from "joi";

// Validation Schema for Adding a Course
export const addCourseSchema = {
  body: joi
    .object({
      title: joi.string().trim().min(3).max(100).required(),
      description: joi.string().trim().allow(null, ''),
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
      description: joi.string().trim().allow(null, ''),
      price: joi.number().min(0),
      thumbnail: joi.string().trim().uri(),
      access_type: joi.string().valid("free", "paid", "prime"),
      instructorId: joi.string(),
    })
    .required(),
};

