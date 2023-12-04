import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { createError } from '@/utils/errorResponse'

export async function getScreenshots(data_id: string) {
  return await fetchData(data_id as string)
}

async function fetchData(data_id: string): Promise<Database.IScreenshot> {
  const data = await ShowroomLog.findOne({ data_id }).select({ 'live_info.screenshot': 1 })
  if (!data?.live_info?.screenshot) {
    throw createError({ statusCode: 404, message: 'Not found!' })
  }
  return data?.live_info?.screenshot
}
