import joi from "joi";
import { generalFields } from "../../middleware/validation";
export const addvideoSchema = {
  body: joi
    .object({
      title: joi.string().min(2).max(200).required(),
      sectionId: generalFields._id.required(),
      publicView: joi.boolean().required(),
    })
    .required(),
  query: joi
    .object({
      courseId: generalFields._id.required(),
    })
    .required(),
};

export const getVideoStatusSchema = {
  params: joi
    .object({
      videoId: generalFields._id.required(),
    })
    .required(),
};
