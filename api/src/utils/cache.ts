import redisClient from '../config/redis';

// Set cache with expiration
export const setCache = async (
  key: string,
  value: any,
  expirationInSeconds: number = 3600
): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, expirationInSeconds, serialized);
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

// Get cache
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Delete cache
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
};

// Delete multiple cache keys by pattern
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
};