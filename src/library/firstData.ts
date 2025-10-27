import type { Context } from 'hono'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { getMembers } from './member'

export async function getFirstData(c: Context): Promise<{ date: string }> {
  return {
    date: await fetchData(c),
  }
}

async function fetchData(c: Context): Promise<string> {
  const members = await getMembers(c)
  const data = await ShowroomLog.findOne({ room_id: members.map(i => i.room_id) }).sort({ _id: 1 })
  return data?.live_info.start_date.toISOString() || ''
}
