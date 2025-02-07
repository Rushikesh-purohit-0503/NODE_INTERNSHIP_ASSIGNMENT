const userModel = require('../models/userModel')
const { ApiResponse } = require('../utils/ApiResponse')
const { ApiError } = require('../utils/ApiErrors')
const { EncryptPassword, verifyPassword } = require('../utils/Password')
const createAuthToken = require('../utils/token')

const cookieOptions = {
    httpOnly: true,
    secure: false,
}

const register = async (req, res) => {
    try {
        let { name, email, password, role } = req.body
        // console.log(req.body)
        if ([email, name, password, role].some((val) => (val === " "))) {
            return res.status(400).json(new ApiResponse(400, { email, name, role }, "Enter valid details"))
        }
        try {
            const exisitingUser = await userModel.findOne({ email: email }).exec()
            if (exisitingUser) {
                return res.status(400).json(new ApiResponse(400, exisitingUser.email, `User with email '${exisitingUser.email}' already exists!`))
            }
            else {
                const hashedPassword = await EncryptPassword(password)
                const newUser = await userModel.create({
                    email: email,
                    name: name,
                    password: hashedPassword,
                    role: role,
                })
                if (newUser) {
                    return res.status(201).json(new ApiResponse(201, newUser, "User created successfully"))
                }
            }
        } catch (error) {
            throw new ApiError(500, 'User not created', error)
        }
    } catch (error) {
        throw new ApiError(500, "Somthing went wrong", error)
    }
}


const login = async (req, res) => {
    try {
        let { email, password } = req.body
        if ([email, password].some((val) => (val === ' '))) {
            return res.status(400).json(new ApiResponse(400, {}, "Enter valid details"))
        }
        let user = {}

        try {
            user = await userModel.findOne({ email: email }).exec()
            if (!user) { return res.status(400).json(new ApiResponse(400, {}, "User not found (Enter valid email) ")) }
        } catch (error) {
            throw new ApiError(400, "error finding in user", error)
        }
        try {
            const isValid = await verifyPassword(user.password, password)
            if (!isValid) {
                return res.status(400).json(new ApiResponse(400, { PasswordValidation: isValid   }, "Invalid Password"))
            }
            const authToken = await createAuthToken(user)
            const loggedInUser = await userModel.findById(user._id).select("-authToken -__v").exec()

            return res.status(200).cookie('authToken', authToken, cookieOptions)
                .json(new ApiResponse(200, {
                    user: loggedInUser,
                    authToken
                }, "User logged in successfully"))

        } catch (error) {
            throw new ApiError(400, "error verifying password", error)
        }

    } catch (error) {
        throw new ApiError(500, "Error while login", error)
    }
}

module.exports = {
    register,
    login
}