const slotModel = require('../models/expertSlotModel')
const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')


const createSlot = async (req, res) => {
    try {
        let { date, startTime, endTime, slotDuration } = req.body
        if (date || startTime || endTime || slotDuration === " ") {
            return res.status(400).json(new ApiResponse(400, {}, "Enter valid details"))
        }
        let expertId = req.user?._id
        let newSlot = {}
        if (expertId) {
            try {
                newSlot = await slotModel.create({
                    expertId: expertId,
                    date: date,
                    slotDuration: slotDuration,
                    startTime: startTime,
                    endTime: endTime
                })
                if(newSlot){
                    return res.status(201).json(new ApiResponse(201,newSlot,"Slot created succesfully"))
                }
            } catch (error) {
                throw new ApiError
            }
        }
    } catch (error) {
        console.error(error)
        throw new ApiError(500, 'Error creating slots', error)
    }
}