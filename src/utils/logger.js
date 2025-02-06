const { createLogger, format, transports } = require("winston");
const winston = require("winston/lib/winston/config");
const { combine, timestamp, json, colorize, printf } = format;

// Custom format for console logging with colors
const myFromate = printf(({ level, message, timestamp, label }) => {
    return `[${level}]  ${timestamp} - ${message} `;
})
const consoleLogFormat = format.combine(
    format.colorize(),
    format.printf(({ level, message, timestamp }) => {
        return `[${level}] ${timestamp} ${message}  `;
    })
);
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    http: 'green',
    debug: 'megenta'
}

const levels = {
    INFO: 'info',
    ERROR: 'error',
    WARN: 'warn',
    HTTP:'http',
    VERBOSE:'verbose',
    DEBUG:'debug',
    SILLY:'silly'
}

winston.addColors(colors)
// Create a Winston logger
const logger = createLogger({
    level: levels,
    format: combine(timestamp({ format: "YY:MM:DD HH:mm:ss" }), myFromate),
    transports: [
        new transports.Console({ level: 'info', format: consoleLogFormat }),
        new transports.File({ filename: "app.log" }),
    ],
});

module.exports = logger;