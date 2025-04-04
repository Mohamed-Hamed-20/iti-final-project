import joi from "joi";
import { generalFields } from "../../middleware/validation"; // Assuming this exists in your project

// Validation Schema for Adding a Post
export const addPostSchema = {
  body: joi
    .object({
      text: joi.string().trim().min(1).max(500).required(),
      category: joi.string().trim().required(),
    })
    .required(),
};

// Validation Schema for Updating a Post
export const updatePostSchema = {
  body: joi
    .object({
      text: joi.string().trim().min(1).max(500),
    })
    .required(),
};

// Validation Schema for Liking a Post
export const likePostSchema = {
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};

// Validation Schema for Adding a Comment
export const addCommentSchema = {
  body: joi
    .object({
      text: joi.string().trim().min(1).max(200).required(),
    })
    .required(),
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};

// Validation Schema for Getting Posts
export const getPostsSchema = {
  query: joi
    .object({
      page: generalFields.page,
      size: generalFields.size,
      select: generalFields.select,
      sort: generalFields.sort,
      search: generalFields.search,
    })
    .required(),
};

// Validation Schema for Getting a Post by ID
export const getPostByIdSchema = {
  params: joi
    .object({
      id: generalFields._id.required(),
    })
    .required(),
};