const express = require('express')
const router = express.Router()
const userController = require('../../controllers/userController')
const {loginValidator,registerValidator} = require('../../validators/authValidators')
const validate = require('../../middleware/validate')
router.route('/register')
    .post(
        validate(registerValidator),
        userController.register)
router.route('/login')
    .post(
        validate(loginValidator),
        userController.login)


module.exports = router