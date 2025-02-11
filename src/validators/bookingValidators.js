const Joi = require("joi");

exports.bookingValidator = Joi.object({
    expertId: Joi.string().required(),
    date: Joi.date().iso().required(),
    time: Joi.string().required()
});
