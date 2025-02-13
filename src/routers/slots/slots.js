const express = require('express')
const router = express.Router()
const expretSlotController = require('../../controllers/expertSlotController')
const { slotValidator } = require('../../validators/expertSlotValidator')
const validate = require('../../middleware/validate')
const Authantication = require('../../middleware/Authantication')
const verifyRoles = require('../../middleware/roles')
const { USER_ROLES_ENUM } = require('../../constants/user_constants')

router.route('/slots')
    .post(
        Authantication,
        verifyRoles(USER_ROLES_ENUM.EXPERT),
        validate(slotValidator),
        expretSlotController.createSlots)

router.route('/slots')
    .delete(
        Authantication,verifyRoles(USER_ROLES_ENUM.EXPERT),expretSlotController.deleteSlots)

router.route('/slots')
    .get(Authantication, verifyRoles(USER_ROLES_ENUM.EXPERT), expretSlotController.getAllSlots)

router.route('/slots/:slotId?')
    .put(Authantication, verifyRoles(USER_ROLES_ENUM.EXPERT),expretSlotController.updateRecurringSlots)

module.exports = router


