import type { Context } from 'hono'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { createError } from '@/utils/errorResponse'

export async function getScreenshots(c: Context) {
  return await fetchData(c.req.param('id') || '0')
}

async function fetchData(data_id: string): Promise<Live.Screenshots> {
  const data = await ShowroomLog.findOne({ data_id }).select({ 'live_info.screenshot': 1 })
  if (!data?.live_info?.screenshot) {
    throw createError({ statusCode: 404, message: 'Not found!' })
  }
  return data?.live_info?.screenshot
}
