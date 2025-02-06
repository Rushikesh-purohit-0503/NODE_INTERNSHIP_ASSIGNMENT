const bcrypt = require('bcrypt')

const EncryptPassword = async (password) => {
    const hashedPassword = await bcrypt.hash(password, 10)
    return hashedPassword
}

const verifyPassword = async (hashedPassword, password) => {
    const isValid = await bcrypt.compare(password, hashedPassword)
    return isValid
}

module.exports = {
    EncryptPassword,
    verifyPassword
}