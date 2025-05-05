const Redis = require('ioredis')
const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
})
const Queue = require('bull')

redis.on("connect", () => {
    console.log("Connected to Redis");
});
redis.on('error', (err) => console.error('Redis Error:', err));

// const redisSubscriber = new Redis()

const bookingQueue = new Queue('bookingQueue', {
    redis: { host: process.env.REDIS_HOST || 'redis', port: process.env.REDIS_PORT || 6379 },
})
// redisSubscriber.config('SET', 'notify-keyspace-events', 'Ex'); // Ensure notifications are enabled
// redisSubscriber.subscribe('__keyevent@0__:expired'); // Subscribe to expiration events


module.exports = { redis, bookingQueue }