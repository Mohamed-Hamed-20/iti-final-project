import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redis.on("connect", () => {
  console.log("Connected to Redis successfully!");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

export default redis;
