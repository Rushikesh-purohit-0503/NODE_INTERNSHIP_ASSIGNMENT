const bookingModel = require('../models/bookingModel')
const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')
const bookingService = require('../services/bookingService')
const { default: mongoose } = require('mongoose')


const bookSlot = async (req, res,) => {
    try {
        let { expertId, date, time } = req.body
        const { id: clientId } = req.user._id
        // console.log(clientId)
        if ([expertId, date, time].some((val) => val === " ")) return res.status(400).json(new ApiResponse(400, {}, "Enter valid details"))

        if (!clientId) return res.status(400).json(new ApiResponse(400, {}, "Please login first"))

        const booking = await bookingService.booking({
            expertId: new mongoose.Types.ObjectId(expertId),
            clientId: new mongoose.Types.ObjectId(clientId),
            date: date,
            time: time
        })
        // console.log(typeof booking)
        if (!booking.success) return res.status(400).json(new ApiResponse(400, booking, "booking not done"))

        return res.status(201).json(new ApiResponse(200, booking.data, booking.message))
    } catch (error) {
        console.error(error)
        throw new ApiError('500', "error booking slot", error.message)
    }
}

const Recommendations = async (req, res) => {
    try {
        const recommended = await bookingService.recommendations()
        if (!recommended || typeof recommended !== 'object') return res.status(404).json(new ApiResponse(404, recommended, "No slots available in near future"))
        return res.status(200).json(new ApiResponse(200, { recommendedSlots: recommended }, "This are the slots available for near future."))
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, error, error.message))
    }
}

const cancelBooking = async (req, res) => {
    try {
        let { id: bookingId } = req.params

        const { id: clientId } = req.user._id
        console.log(clientId)
        if (!bookingId) return res.status(400).json(new ApiResponse(400, {}, "No bookingId provided"))

        const canceled = await bookingService.cancelBooking({ bookingId: new mongoose.Types.ObjectId(bookingId), clientId: new mongoose.Types.ObjectId(clientId) })

        if (canceled.success) return res.status(200).json(new ApiResponse(200, canceled, canceled.message))
        else return res.status(400).json(new ApiResponse(400, canceled, canceled.message))
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, error, error.message))
    }
}

const getAllBookingsForClient = async (req, res) => {
    try {
        let { id: clientId } = req.user._id
        if(!clientId) return res.status(401).json(new ApiResponse(401,{},"Please login first"))
        
        const bookings = await bookingService.getAllBookings({clientId: new mongoose.Types.ObjectId(clientId)})
        if(bookings) return res.status(200).json(new ApiResponse(200,bookings,"bookings fetched succesfully"))
        
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, error, "Error fetching bookings"))
    }
}
module.exports = {
    bookSlot,
    Recommendations,
    cancelBooking,
    getAllBookingsForClient
}