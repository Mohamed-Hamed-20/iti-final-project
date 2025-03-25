import joi from "joi";
import { generalFields } from "../../middleware/validation";
export const sendRequestToDeleteSchema = {
  body: joi
    .object({
      type: joi.string().valid("course", "section", "video").required(),
      targetId: generalFields._id.required(),
      reason: joi.string().min(2).max(5000).required(),
    })
    .required(),
};

export const cancelMyrequestSchema = {
  query: joi
    .object({
      requestId: generalFields._id.required(),
    })
    .required(),
};
