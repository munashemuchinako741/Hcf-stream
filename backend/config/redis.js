const redis = require('redis');

// Redis client for caching and session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
  },
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis connection ended');
});

// Connect to Redis
redisClient.connect().catch(console.error);

module.exports = redisClient;
