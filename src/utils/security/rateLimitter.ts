import type { Context } from 'hono'
import { getIp } from '.'

const requestCounts = new Map()

export function isTooManyRequest(c: Context, maxRequest: number, limitTimeWindow: number) {
  const ip = getIp(c)
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: Date.now() })
  }
  else {
    const requestData = requestCounts.get(ip)
    requestData.count++
    if (Date.now() - requestData.startTime > limitTimeWindow) {
      requestData.count = 1
      requestData.startTime = Date.now()
    }
    else if (requestData.count > maxRequest) {
      return true
    }
  }
  return false
}
