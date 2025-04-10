import joi from "joi";
import { generalFields } from "../../middleware/validation";

export const getMessagesSchema = {
  query: joi
    .object({
      page: generalFields.page,
      size: generalFields.size,
      search: generalFields.search,
      select: generalFields.select,
      sort: generalFields.sort,
      conversationId: generalFields._id.required(),
    })
    .required(),
};
