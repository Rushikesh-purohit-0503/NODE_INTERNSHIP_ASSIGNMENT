const bookingModel = require('../models/bookingModel')
const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')


const bookSlot = async (req, res,) => {
    try {
        const newSlot =  
    } catch (error) {
        console.error(error)
        throw new ApiError('500',"error booking slot",error.message)
    }
}

