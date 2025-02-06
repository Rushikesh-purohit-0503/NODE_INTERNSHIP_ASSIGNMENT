const Joi = require("joi");

exports.registerValidator = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "expert", "client").required(),
});

exports.loginValidator = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});
