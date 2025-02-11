const express = require('express')
const router = express.Router()
const bookingController = require('../../controllers/bookingController')
const { bookingValidator } = require('../../validators/bookingValidators')
const validate = require('../../middleware/validate')
const Authantication = require('../../middleware/Authantication')
const verifyRoles = require('../../middleware/roles')
const { USER_ROLES_ENUM } = require('../../constants/user_constants')

router.route('/')
    .post(Authantication,
        verifyRoles(USER_ROLES_ENUM.CLIENT),
        validate(bookingValidator),
        bookingController.bookSlot)

router.route('/recommendations')
    .get(Authantication,verifyRoles(USER_ROLES_ENUM.CLIENT),bookingController.Recommendations)
module.exports = router