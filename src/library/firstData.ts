import { getMembers } from './member'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import config from '@/config'

export async function getFirstData(query: any): Promise<{ date: string }> {
  const group = config.getGroup(query?.group || '')
  return {
    date: await fetchData(group),
  }
}

async function fetchData(group: string | null = null): Promise<string> {
  const members = await getMembers(group)
  const data = await ShowroomLog.findOne({ room_id: members.map(i => i.room_id) }).sort({ _id: 1 })
  return data?.live_info.start_date.toISOString() || ''
}
