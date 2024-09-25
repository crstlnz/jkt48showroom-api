import type { Context } from 'hono'
import { getMembers } from './member'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import LiveLog from '@/database/live/schema/LiveLog'

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
      select: '-_id name info.img slug',
    },
  }
  const members = await getMembers(c)
  const options: { is_dev: boolean, room_id?: number[] | number | Record<string, boolean> } = {
    is_dev: false,
  }
  if (members?.length) {
    options.room_id = members.map(i => i.room_id).filter((i): i is number => i != null)
  }
  else {
    options.room_id = { $exists: true }
  }

  const mostViewer = await LiveLog.findOne(options).sort({ 'live_info.viewers.peak': -1 }).populate(populatePath).lean().catch(() => null)
  const longestDuration = await LiveLog.findOne(options).sort({ 'live_info.duration': -1 }).populate(populatePath).lean().catch(() => null)
  const mostGiftIdn = await LiveLog.findOne({ ...options, type: 'idn' }).sort({ total_gifts: -1 }).populate(populatePath).lean().catch(() => null)
  const mostGiftSr = await LiveLog.findOne({ ...options, type: 'showroom' }).sort({ total_gifts: -1 }).populate(populatePath).lean().catch(() => null)
  const mostGift = (mostGiftIdn?.total_gifts ?? 0) * (mostGiftIdn?.c_gift ?? 0) > (mostGiftSr?.total_gifts ?? 0) * (mostGiftSr?.c_gift ?? 0) ? mostGiftIdn : mostGiftSr

  const records: ShowroomRecord[] = []
  if (mostViewer) {
    records.push({
      title: 'Most Viewer',
      data_id: mostViewer.data_id,
      key: 'mostviewer',
      name: mostViewer.room_info?.member_data?.name ?? mostViewer.room_info?.name ?? '',
      value: String(mostViewer.live_info.viewers?.peak ?? 0),
      date: mostViewer.created_at.toISOString(),
      img: mostViewer.room_info?.member_data?.info?.img ?? mostViewer.room_info?.img ?? '',
      room_id: mostViewer.room_id ?? 0,
      url: `/member/${mostViewer.room_info?.member_data?.slug}`,
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
      img: longestDuration.room_info?.member_data?.info?.img ?? longestDuration.room_info?.img ?? '',
      room_id: longestDuration.room_id ?? 0,
      url: `/member/${longestDuration.room_info?.member_data?.slug}`,
      parser: 'duration',
    })
  }

  if (mostGift) {
    records.push({
      title: 'Most Gift',
      data_id: mostGift.data_id,
      key: 'mostgifts',
      name: mostGift.room_info?.member_data?.name ?? mostGift.room_info?.name ?? '',
      value: String(mostGift.total_gifts ?? 0),
      date: mostGift.created_at.toISOString(),
      img: mostGift.room_info?.member_data?.info?.img ?? mostGift.room_info?.img ?? '',
      room_id: mostGift.room_id ?? 0,
      url: `/member/${mostGift.room_info?.member_data?.slug}`,
      parser: 'gift',
    })
  }
  return records ?? []
}
