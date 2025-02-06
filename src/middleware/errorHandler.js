const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    // Default to 500 if no status code is set
    if (!statusCode) statusCode = 500;

    res.status(statusCode).json({
        success: false,
        message,
    });
    next();
};

module.exports = errorHandler