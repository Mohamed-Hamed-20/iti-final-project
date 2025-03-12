import joi from "joi";
import { generalFields } from "../../middleware/validation";

// name, email, password, age, phone
export const registerSchema = {
  body: joi
    .object({
      name: joi.string().trim().min(3).max(33).required(),
      email: generalFields.email.required(),
      password: generalFields.password.required(),
      confirmPassword: joi.valid(joi.ref("password")).required(),
      age: joi.number().min(5).max(140).required(),
      phone: generalFields.PhoneNumber.required(),
    })
    .required(),
};

export const loginSchema = {
  body: joi
    .object({
      email: generalFields.email.required(),
      password: generalFields.password.required(),
    })
    .required(),
};

export const confirmEmailSchema = {
  params: joi
    .object({
      token: joi.string().required(),
    })
    .required(),
};

export const cokkiesSchema = {
  cookies: joi
    .object({
      accessToken: joi
        .string()
        .pattern(/^(Bearer )[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        .required(),
      refreshToken: joi
        .string()
        .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        .required(),
    })
    .required(),
};
