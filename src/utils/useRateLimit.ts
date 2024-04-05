const rateLimit = new Set()
const maxConcurrentProcess = Number(process.env.MAX_CONCURRENT_PROCESS ?? 20)

export interface RateLimitedResponse {
  limited: true
}

export interface RateOkResponse {
  limited: false
  clear: () => void
}

export default function useRateLimit(): RateLimitedResponse | RateOkResponse {
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
