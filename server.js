require('dotenv').config({ path: "./.env" })
const express = require('express')
const logger = require('./src/utils/logger.js')
const morgan = require('morgan')
const PORT = process.env.PORT
const app = express()


const morganFormat = ":method :url :status :res[content-length] :response-time ms";

app.use(morgan(morganFormat, { stream: { write: (message) => logger.info(message) } }));







app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`)
})