const express = require('express')
const router = express.Router()
const userRoute = require('./user/user.js')
const ExpertSloteRoute = require('./slots/slots.js')

/** user rute */
router.use('/user', userRoute)

/** expertSlotRoute */
router.use('/experts',ExpertSloteRoute)


module.exports = router