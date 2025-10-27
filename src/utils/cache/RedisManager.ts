import type { RedisKey } from 'ioredis'
import { Redis } from 'ioredis'
// import redis from '@utils/redis'

interface WithExpire<T> {
  expireIn: number
  data: T
}

class RedisManager {
  maxRetry: number
  redis: Redis
  delay: number // retry delay
  constructor() {
    this.redis = new Redis(process.env.REDIS_URI ?? '')
    this.maxRetry = 2
    this.delay = 1000
  }

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  parse(value: any) {
    try {
      return JSON.parse(value)
    }
    catch {
      return value
    }
  }

  async delete(key: string | number) {
    return await this.redis.del(String(key))
  }

  async get<T>(key: RedisKey | string | number, withExpire?: true, retry?: number): Promise<WithExpire<T> | null>
  async get<T>(key: RedisKey | string | number, withExpire?: false, retry?: number): Promise<T | null>
  async get<T>(key: RedisKey | string | number, withExpire?: boolean, retry?: number): Promise<WithExpire<T> | T | null>
  async get<T>(
    key: RedisKey | string | number,
    withExpire = false,
    retry = 0,
  ): Promise<T | WithExpire<T> | null> {
    if (retry > 0) await this.sleep(this.delay)
    try {
      const expireIn = await this.redis.pttl(key as RedisKey)
      if (expireIn <= 0) return null
      const d = await this.redis.get(key as RedisKey)
      if (!d) return null
      const data = this.parse(d) as T
      if (!withExpire) return data
      return {
        expireIn,
        data,
      } as WithExpire<T>
    }
    catch (e) {
      if (retry < this.maxRetry) {
        return await this.get(key, withExpire, retry + 1)
      }
      else {
        throw e
      }
    }
  }

  async set(
    key: string | number,
    value: string | object,
    ms = 3600000,
    retry = 0,
  ): Promise<void> {
    if (retry > 0) await this.sleep(this.delay)
    try {
      await this.redis.set(String(key), JSON.stringify(value), 'PX', ms)
    }
    catch (e) {
      if (retry < this.maxRetry) {
        await this.set(key, value, ms, retry + 1)
      }
      else {
        throw e
      }
    }
  }

  async clear() {
    await this.redis.flushall()
  }
}

export default RedisManager
