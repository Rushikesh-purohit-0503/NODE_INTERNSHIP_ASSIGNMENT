const Joi = require("joi");

exports.bookingValidator = Joi.object({
    expertId: Joi.string().required(),
    slotId: Joi.string().required(),
});
