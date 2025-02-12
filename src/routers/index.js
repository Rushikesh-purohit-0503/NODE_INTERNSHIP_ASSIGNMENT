const express = require('express')
const router = express.Router()
const userRoute = require('./user/user.js')
const expertSloteRoute = require('./slots/slots.js')
const bookingRoute = require('./booking/booking.js')
const adminRoute = require('./admin/admin.js') 

/** userRoute */
router.use('/user', userRoute)

/** expertSlotRoute */
router.use('/experts',expertSloteRoute)

/** bookingRoute */
router.use('/bookings',bookingRoute)

/** adminRoute */
router.use('/admin',adminRoute)


module.exports = router