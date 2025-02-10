const slotModel = require('../models/expertSlotModel')
const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')
const slotService = require('../services/slotSrevice')
const { default: mongoose } = require('mongoose')

const createSlots = async (req, res, next) => {
    try {
        let { date, startTime, endTime, slotDuration, recurring } = req.body
        if ([date, startTime, endTime, slotDuration].some((val) => (val === " "))) {
            return res.status(400).json(new ApiResponse(400, {}, "Enter valid details "))
        }


        let expertId = req.user?._id
        let newSlot = await slotService.createSlots({
            expertId,
            date,
            startTime,
            endTime,
            slotDuration,
            recurring: recurring || false
        })
        if (newSlot) {
            return res.status(201).json(new ApiResponse(201, newSlot, "Slot created succesfully"))
        }

    } catch (error) {
        return res.status(400).json(new ApiResponse(400, error, error.message))

        // console.error(error)
        // next(error)
        // throw new ApiError(500, 'Error creating slots', error)
    }
}

const deleteSlots = async (req, res) => {
    try {
        const { startDate, endDate } = req.body
        const expertId = req.user?._id
        if ([expertId, startDate, endDate].some((val) => (val === " "))) return res.status(400).json(new ApiResponse(400, {}, "Enter valid details."))


        const result = await slotService.deleteSlots({ expertId, startDate: new Date(startDate), endDate: new Date(endDate) })
        if (!result) {
            return res.status(500).json(new ApiResponse(500, result, "Error while deleting slot"))
        }
        return res.status(200).json(new ApiResponse(200, result, "Slots deleted succesfully"))
    } catch (error) {
        console.log(error)
        throw new ApiError(500, 'error deleting slots', error)
    }
}

const getSlots = async (req, res) => {
    try {
        const { id: expertId } = req.user?._id;
        let { startDate, endDate } = req.query;
        if (!endDate) endDate = endDate || startDate
        const result = await slotService.getSlots({
            expertId,
            startDate,
            endDate,
        });
    
        if (result.length === 0) return res.status(400).json(new ApiResponse(400, result, `Enter valid date or There are no slots created`))

        return res.status(200).json(new ApiResponse(200, result, `Slots for user ${result.expertId} fetched`))
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, result, "Error while fetching"))
        console.log(error)
        throw new ApiError(500, 'Error fetching slots', error)
    }
}

const updateRecurringSlots = async (req, res) => {
    try {
        let { startDate, newStartTime, newEndTime, slotDuration, recurringDays } = req.body
        const  {slotId}  = req.params
        console.log(slotId.toString())
        let expertId = req.user?._id
        if ([expertId, startDate, newEndTime, slotDuration, newStartTime].some((val) => (val === " "))) return res.status(400).json(new ApiResponse(400, {}, "Enter valid details."))
        const result = await slotService.updateRecurringSlots({
            expertId: new mongoose.Types.ObjectId(expertId),
            slotId: new mongoose.Types.ObjectId(slotId),
            startDate: startDate,
            newStartTime: newStartTime,
            newEndTime: newEndTime,
            slotDuration: slotDuration,
            recurringDays: recurringDays
        })
        if (result) return res.status(200).json(new ApiResponse(200, result, 'Successfully updated'))
    } catch (error) {
        throw new ApiError(500, error.message, error)
    }
}

module.exports = {
    createSlots,
    getSlots,
    deleteSlots,
    updateRecurringSlots
}