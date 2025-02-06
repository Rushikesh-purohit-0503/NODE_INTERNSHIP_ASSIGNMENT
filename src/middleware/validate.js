const ApiError = require('../utils/ApiErrors')
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      message = error.details.map((err) => err.message);
      return next( new ApiError(400,message.join(', '),err))
    }

    next(); // Proceed to the next middleware/controller
  };
};

module.exports = validate;
