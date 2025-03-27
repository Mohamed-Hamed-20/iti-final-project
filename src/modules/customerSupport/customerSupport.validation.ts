import Joi from "joi";

export const createTicketSchema = {
  body: Joi.object({

    subject: Joi.string().min(5).max(100).required().messages({
      "string.empty": "Subject is required",
      "string.min": "Subject must be at least 5 characters",
      "string.max": "Subject must not exceed 100 characters",
      "any.required": "Subject is required",
    }),
    message: Joi.string().min(10).max(1000).required().messages({
      "string.empty": "Message is required",
      "string.min": "Message must be at least 10 characters",
      "string.max": "Message must not exceed 1000 characters",
      "any.required": "Message is required",
    }),
    priority: Joi.string().valid("low", "medium", "high", "urgent").default("medium"),
  }),
};

export const createTicketWithoutAuthSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email',
      'string.empty': 'Email is required'
    }),
    subject: Joi.string().min(5).max(100).required().messages({
      'string.empty': 'Subject is required',
      'string.min': 'Subject must be at least 5 characters',
      'string.max': 'Subject cannot exceed 100 characters'
    }),
    message: Joi.string().min(10).max(1000).required().messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message cannot exceed 1000 characters'
    }),
    priority: Joi.string().valid('low', 'medium', 'high').default('low')
  })
}

export const updateTicketSchema = {
  body: Joi.object({
    status: Joi.string().valid("open", "in_progress", "resolved", "closed"),
    priority: Joi.string().valid("low", "medium", "high", "urgent"),
    assignedTo: Joi.string().hex().length(24),
    resolution: Joi.string().min(10).max(1000).when("status", {
      is: "resolved",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
