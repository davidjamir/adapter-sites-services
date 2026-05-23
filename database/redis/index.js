import { Redis } from "@upstash/redis";

const REDIS_NODE_COUNT = 20;

class RedisCluster {
  hash(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }

    return hash;
  }

  getNode(key) {
    const hash = this.hash(key);

    const index = (hash % REDIS_NODE_COUNT) + 1;

    const url = process.env[`REDIS${index}_URL`];
    const token = process.env[`REDIS${index}_TOKEN`];

    if (!url || !token) {
      throw new Error(`Missing Redis node ${index}`);
    }

    return new Redis({
      url,
      token,
    });
  }

  async get(key) {
    return this.getNode(key).get(key);
  }

  async set(key, value, ttlSeconds) {
    const redis = this.getNode(key);

    if (ttlSeconds) {
      return redis.set(key, value, {
        ex: ttlSeconds,
      });
    }

    return redis.set(key, value);
  }
}

export const redis = new RedisCluster();
