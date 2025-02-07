const Joi = require("joi");
const {USER_ROLES_ENUM} = require('../constants/user_constants')


exports.registerValidator = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.number().valid(USER_ROLES_ENUM.ADMIN, USER_ROLES_ENUM.EXPERT, USER_ROLES_ENUM.CLIENT).default(USER_ROLES_ENUM.CLIENT),
});

exports.loginValidator = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});
