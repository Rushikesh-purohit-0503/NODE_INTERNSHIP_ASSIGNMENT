const express = require('express')
const router = express.Router()
const userController = require('../../controllers/userController')
const {loginValidator,registerValidator} = require('../../validators/authValidators')
const validate = require('../../middleware/validate')
const Authantication = require('../../middleware/Authantication')
router.route('/register')
    .post(
        validate(registerValidator),
        userController.register)
router.route('/login')
    .post(
        validate(loginValidator),
        userController.login)

router.route('/logout')
    .post(
        Authantication,
        userController.logout
    )

module.exports = router