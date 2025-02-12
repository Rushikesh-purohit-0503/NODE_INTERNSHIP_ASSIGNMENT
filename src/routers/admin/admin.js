const express = require('express')
const router = express.Router()
const analyticsController = require('../../controllers/analyticsController')
const verifyUserRoles = require('../../middleware/roles')
const Authentication = require('../../middleware/Authantication')
const { USER_ROLES_ENUM } = require('../../constants/user_constants')


router.route('/analytics/usage')
    .get(Authentication,
        verifyUserRoles(USER_ROLES_ENUM.ADMIN),
        analyticsController.getTotalBookingsPerExpert)


module.exports = router