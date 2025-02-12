const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')
const analyticsService = require('../services/analyticsService')
const { default: mongoose } = require('mongoose')


const getTotalBookingsPerExpert = async (req, res) => {
    try {
        const result = await analyticsService.getTotalBookingsPerExpert()

        if (!result.status) return res.status(400).json(new ApiResponse(400, result.data, result.message))
        if (result.error) return res.status(500).json(new ApiResponse(500, result.error, result.message))
        return res.status(200).json(new ApiResponse(200, result.data, result.message))
    } catch (error) {
        throw new ApiError(500, {}, error)
        return res.status(500).json(new ApiResponse(500, {}, error.message))
    }
}

module.exports = { getTotalBookingsPerExpert }
