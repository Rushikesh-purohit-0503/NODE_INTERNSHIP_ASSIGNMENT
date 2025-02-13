const Joi = require("joi");

exports.slotValidator = Joi.object({
    date: Joi.date().iso().required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
    slotDuration: Joi.number().valid(15, 30, 60).required(),
    recurring: Joi.boolean().default(false),
    frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').default(null),
    occurence: Joi.number().default(5),
    slotSize: Joi.number().default(5)
});
