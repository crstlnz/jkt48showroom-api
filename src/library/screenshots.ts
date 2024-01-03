import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import LiveLog from '@/database/live/schema/LiveLog'

export async function getScreenshots(c: Context) {
  return await fetchData(c.req.param('id') || '0')
}

async function fetchData(data_id: string): Promise<Live.Screenshots> {
  const data = await LiveLog.findOne({ data_id }).select({ 'live_info.screenshot': 1 })
  if (!data?.live_info?.screenshots) {
    throw createError({ statusCode: 404, message: 'Not found!' })
  }
  return data?.live_info?.screenshots
}
