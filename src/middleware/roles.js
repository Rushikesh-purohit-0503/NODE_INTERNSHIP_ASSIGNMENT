const ApiError = require("../utils/ApiErrors");

const verifyUserRoles = (...userRoles) => {
    return (req, _, next) => {
        try {
            console.log('User role:', req.user?.role); // Debugging log
            console.log('Allowed roles:', userRoles);

            if (!req?.user?.role) {
                throw new ApiError(400, 'User has no credible role');
            }

            if (!userRoles.includes(req.user?.role)) throw new ApiError(403, 'Forbidden you do not have permission.');
            next()

        } catch (error) {
            next(error)
        }
    }
}