const rateLimit = new Set()
const maxConcurrentProcess = Number(process.env.MAX_CONCURRENT_PROCESS ?? 15)

export interface RateLimitedResponse {
  limited: true
}

export interface RateOkResponse {
  limited: false
  clear: () => void
}

export default function useRateLimit(): RateLimitedResponse | RateOkResponse {
  if (Number(process.env.ENABLE_RATE_LIMIT ?? 0) !== 1)   return {
      limited: false,
      clear : ()=>{}
    } 
  const uuid = crypto.randomUUID()
  if (rateLimit.size > maxConcurrentProcess) {
    return {
      limited: true,
    }
  }
  rateLimit.add(uuid)
  return {
    limited: false,
    clear: () => {
      rateLimit.delete(uuid)
    },
  }
}
