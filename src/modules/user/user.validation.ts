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

export const instructorsserchSchema = {
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
