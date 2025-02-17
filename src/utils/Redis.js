const Redis = require('ioredis')
const redis = new Redis()
const Queue = require('bull')

redis.on("connect", () => {
    console.log("Connected to Redis");
});
redis.on('error', (err) => console.error('Redis Error:', err));

// const redisSubscriber = new Redis()

const bookingQueue = new Queue('bookingQueue', {
    redis: { host: "127.0.0.1", port: 6379 }
})
// redisSubscriber.config('SET', 'notify-keyspace-events', 'Ex'); // Ensure notifications are enabled
// redisSubscriber.subscribe('__keyevent@0__:expired'); // Subscribe to expiration events


module.exports = { redis, bookingQueue }