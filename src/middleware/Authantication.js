const userModel = require('../models/userModel')
const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiErrors')
const { ApiResponse } = require('../utils/ApiResponse')


const Authantication = async (req, res, next) => {
    try {
        const token = req.cookies?.authToken || req.header('Authorization')?.replace('Bearer ', '')

        if (!token) return res.status(401).json(new ApiResponse(401, {}, "no token provided Unauthorized"))

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await userModel.findById(decoded._id).select("-password -refreshToken")

        if (!user) return res.status(403).json(new ApiResponse(403, {}, "User not allowed to access this resource"))
        req.user = user
        next()
    } catch (error) {
        console.error("Error in verifyJwt middleware: ", error)
        throw new ApiError(401, "Unauthorized, invalid token")
    }
}
module.exports = Authantication          