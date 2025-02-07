const {ApiError} = require('../utils/ApiErrors');
const { ApiResponse } = require('../utils/ApiResponse');
const validate = (schema) => {

  return (req, res, next) => {
    // console.log(req.body)
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      message = error.details.map((err) => err.message);
      return res.status(400).json(new ApiResponse(400,message,"Enter valid details"))
    }

    next();
  };
};

module.exports = validate;
