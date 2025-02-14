const Redis = require('ioredis')
const redis = new Redis()

redis.on("connect", () => {
    console.log("Connected to Redis");
});
redis.on('error', (err) => console.error('Redis Error:', err));

// const redisSubscriber = new Redis()

// redisSubscriber.config('SET', 'notify-keyspace-events', 'Ex'); // Ensure notifications are enabled
// redisSubscriber.subscribe('__keyevent@0__:expired'); // Subscribe to expiration events


module.exports = { redis }