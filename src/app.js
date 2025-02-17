require('dotenv').config({ path: "./.env" })
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const logger = require('./utils/logger.js')
const { determineLogLevel } = require('./utils/loglevel.js')
const morgan = require('morgan')
const route = require('./routers/index.js')
const bodyParser =require('body-parser')
const errorHandler = require('./middleware/errorHandler.js')


app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(errorHandler)
const morganFormat = ":method :url :status :res[content-length] :response-time ms";
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => {
            // Example message: 'GET / 200 - 2.345 ms'
            const [method, url, statusCode] = message.trim().split(' ');
            
            // Dynamically set log level based on HTTP status code
            const level = determineLogLevel(parseInt(statusCode));
            logger.log({ level, message: message.trim() });
        },
    }
}));

app.use(express.json())
app.use('/api', route)

module.exports = { app }