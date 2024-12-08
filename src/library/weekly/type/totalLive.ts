import dayjs from 'dayjs'
import type { FormatType, LivePlatform, WeeklyData } from '..'
import { getMember, getOneWeekLives } from '../query'

export default async function totalLive(type: LivePlatform, format: FormatType): Promise<WeeklyData> {
  const members = await getMember()
  const weeklyLives = await getOneWeekLives(members, type)
  const giftsMap = new Map<number, number>()
  for (const live of weeklyLives) {
    const g = giftsMap.get(live.room_id)
    giftsMap.set(live.room_id, (g ?? 0) + 1)
  }

  const sorted = members.map((m) => {
    const liveCount = giftsMap.get(m.showroom_id ?? 0) ?? 0
    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = `${liveCount}x`
        break
      case 'extended':
        val = `${liveCount}x`
        break
      default:
        val = liveCount
        break
    }
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: liveCount,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'MEMBER PALING RAJIN LIVE',
    type: 'live',
    platform: type,
    date: dayjs().toISOString(),
    data: sorted.map((d) => {
      return {
        ...d,
        num_value: undefined,
      }
    }),
  }
}
