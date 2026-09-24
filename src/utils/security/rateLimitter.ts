import type { Context } from 'hono'
import { getIp } from '.'

const requestCounts = new Map<string, { count: number, expiresAt: number }>()
let lastCleanupAt = 0

function cleanupExpiredRequests(now: number) {
  if (now - lastCleanupAt < 60 * 1000) return
  lastCleanupAt = now
  for (const [key, requestData] of requestCounts) {
    if (requestData.expiresAt <= now) requestCounts.delete(key)
  }
}

export function isTooManyRequest(c: Context, maxRequest: number, limitTimeWindow: number) {
  const now = Date.now()
  cleanupExpiredRequests(now)
  const ip = getIp(c) ?? 'unknown'
  const key = `${maxRequest}:${limitTimeWindow}:${ip}`
  const requestData = requestCounts.get(key)
  if (!requestData || requestData.expiresAt <= now) {
    requestCounts.set(key, { count: 1, expiresAt: now + limitTimeWindow })
    return false
  }

  requestData.count++
  return requestData.count > maxRequest
}
