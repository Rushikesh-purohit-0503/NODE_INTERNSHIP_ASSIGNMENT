const express = require('express')
const router = express.Router()
const userRoute = require('./user/user.js')
const ExpertSloteRoute = require('./slots/slots.js')
const bookingRoute = require('./booking/booking.js')
/** user rute */
router.use('/user', userRoute)

/** expertSlotRoute */
router.use('/experts',ExpertSloteRoute)

/** bookingRoute */
router.use('/bookings',bookingRoute)
module.exports = router