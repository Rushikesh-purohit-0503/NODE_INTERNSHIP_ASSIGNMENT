require('dotenv').config({ path: "./.env" })
const express = require('express')
const logger = require('./utils/logger.js')
const { determineLogLevel } = require('./utils/loglevel.js')
const morgan = require('morgan')
const PORT = process.env.PORT || 3500
const app = express()


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

app.get('/', (req, res) => {
    console.log("hello")
    res.status(200)
})

app.listen(PORT, () => {
    logger.info("⚙️  Server is running on port: " + process.env.PORT);
})