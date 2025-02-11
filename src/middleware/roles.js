const { ApiError } = require("../utils/ApiErrors");
const { ApiResponse } = require("../utils/ApiResponse");

const verifyUserRoles = (...userRoles) => {
    return (req, res, next) => {
        try {
            // console.log('User role:', req.user?.role); // Debugging log
            // console.log('Allowed roles:', userRoles);

            if (!req?.user?.role) {
               return res.status(400).json(new ApiResponse(400,{},"User has no credible role"))
            }

            if (!userRoles.includes(Number(req.user?.role)))
                return res.status(403).json(new ApiResponse(403,{},"Forbidden you do not have permission."))

            next()

        } catch (error) {
            next(error)
        }
    }
}

module.exports = verifyUserRoles