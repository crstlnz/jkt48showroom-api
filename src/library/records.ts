import type { Context } from 'hono'
import { getMembers } from './member'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'

export async function getRecords(c: Context) {
  return await fetchData(c)
}

// TODO
async function fetchData(c: Context): Promise<ShowroomRecord[]> {
  const populatePath = {
    path: 'room_info',
    select: '-_id name img url -room_id member_data',
    populate: {
      path: 'member_data',
      select: '-_id name img',
    },
  }
  const members = await getMembers(c)
  const options: { is_dev: boolean, room_id?: number[] | number } = {
    is_dev: false,
  }
  if (members?.length) options.room_id = members.map(i => i.room_id)

  const mostViewer = await ShowroomLog.findOne(options).sort({ 'live_info.viewers.peak': -1 }).populate(populatePath).lean().catch(() => null)
  const longestDuration = await ShowroomLog.findOne(options).sort({ 'live_info.duration': -1 }).populate(populatePath).lean().catch(() => null)
  const mostGift = await ShowroomLog.findOne(options).sort({ total_point: -1 }).populate(populatePath).lean().catch(() => null)

  const records: ShowroomRecord[] = []
  if (mostViewer) {
    records.push({
      title: 'Most Viewer',
      data_id: mostViewer.data_id,
      key: 'mostviewer',
      name: mostViewer.room_info?.member_data?.name ?? mostViewer.room_info?.name ?? '',
      value: String(mostViewer.live_info.viewers?.peak ?? 0),
      date: mostViewer.created_at.toISOString(),
      img: mostViewer.room_info?.member_data?.img ?? mostViewer.room_info?.img ?? '',
      room_id: mostViewer.room_id ?? 0,
      url: `/member/${mostViewer.room_info?.url}`,
      parser: 'viewer',
    })
  }

  if (longestDuration) {
    records.push({
      title: 'Longest Live',
      data_id: longestDuration.data_id,
      key: 'longestlive',
      name: longestDuration.room_info?.member_data?.name ?? longestDuration.room_info?.name ?? '',
      value: String(longestDuration.live_info?.duration ?? 0),
      date: longestDuration.created_at.toISOString(),
      img: longestDuration.room_info?.member_data?.img ?? longestDuration.room_info?.img ?? '',
      room_id: longestDuration.room_id ?? 0,
      url: `/member/${longestDuration.room_info?.url}`,
      parser: 'duration',
    })
  }

  if (mostGift) {
    records.push({
      title: 'Most Gift',
      data_id: mostGift.data_id,
      key: 'mostgifts',
      name: mostGift.room_info?.member_data?.name ?? mostGift.room_info?.name ?? '',
      value: String(mostGift.total_point ?? 0),
      date: mostGift.created_at.toISOString(),
      img: mostGift.room_info?.member_data?.img ?? mostGift.room_info?.img ?? '',
      room_id: mostGift.room_id ?? 0,
      url: `/member/${mostGift.room_info?.url}`,
      parser: 'gift',
    })
  }
  return records ?? []
}
