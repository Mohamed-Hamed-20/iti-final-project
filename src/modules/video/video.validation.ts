import joi from "joi";
import { generalFields } from "../../middleware/validation";
export const addvideoSchema = {
  body: joi
    .object({
      title: joi.string().required(),
      courseId: generalFields._id.required(),
    })
    .required(),
};
