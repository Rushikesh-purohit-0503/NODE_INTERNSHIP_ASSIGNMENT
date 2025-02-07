const Redis = require ('ioredis')
const redis = new Redis()

redis.on("connect", () => {
    console.log("Connected to Redis");
});

module.exports = redis