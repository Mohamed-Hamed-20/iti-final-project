import redis from "./redis";
import Redis from "ioredis";

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  public async get(key: string): Promise<any> {
    try {
      const cachedData = await this.redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error("Error while getting data from cache:", error);
      throw new Error("Failed to retrieve data from cache.");
    }
  }

  public async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttl);
      console.log(
        `Data for key "${key}" successfully cached for ${ttl} seconds.`
      );
    } catch (error) {
      console.error(
        `Error while setting data for key "${key}" to cache:`,
        error
      );
      throw new Error(`Failed to set data for key "${key}" to cache.`);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`Data for key "${key}" successfully deleted from cache.`);
    } catch (error) {
      console.error(
        `Error while deleting data for key "${key}" from cache:`,
        error
      );
      throw new Error(`Failed to delete data for key "${key}" from cache.`);
    }
  }
}
