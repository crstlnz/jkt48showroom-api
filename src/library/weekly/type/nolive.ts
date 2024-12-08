import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { FormatType, WeeklyData } from '..'
import { getMember } from '../query'
import LiveLog from '@/database/live/schema/LiveLog'

dayjs.extend(relativeTime)

export default async function weeklyNolive(format: FormatType): Promise<WeeklyData> {
  const members = await getMember()

  const lastLiveMap = new Map<number, number>()

  for (const member of members) {
    const data = await LiveLog.findOne(
      {
        room_id: member.showroom_id,
      },
    ).sort({
      'live_info.date.end': -1,
    }).lean()

    lastLiveMap.set(member.showroom_id!, dayjs(data?.live_info.date.end).valueOf())
  }

  const sorted = members.map((m) => {
    const lastLive = lastLiveMap.get(m.showroom_id ?? 0)
    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = lastLive ? dayjs(lastLive).locale('id').fromNow() : 'Tidak pernah live'
        break
      case 'extended':
        val = lastLive ? dayjs(lastLive).locale('id').fromNow() : 'Tidak pernah live'
        break
      default:
        val = lastLive || 0
        break
    }
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: lastLive ?? -1,
    }
  }).sort((a, b) => {
    return a.num_value - b.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: '',
    type: 'nolive',
    platform: 'all',
    date: dayjs().toISOString(),
    data: sorted.map((d) => {
      return {
        ...d,
        num_value: undefined,
      }
    }),
  }
}
