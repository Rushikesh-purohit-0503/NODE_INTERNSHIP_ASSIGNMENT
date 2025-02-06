const Joi = require("joi");

exports.slotValidator = Joi.object({
    date: Joi.date().iso().required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
    slotDuration: Joi.number().valid(15, 30, 60).required(),
    maxBookings: Joi.number().min(1).max(5).required(),
});
