import dayjs from 'dayjs'
import type { FormatType, LivePlatform, WeeklyData } from '..'
import { getMember, getOneWeekLives } from '../query'
import { youtubeViewsFormat } from '@/utils/format'

export default async function weeklyViewers(type: LivePlatform, format: FormatType): Promise<WeeklyData> {
  const members = await getMember()
  const weeklyLives = await getOneWeekLives(members, type)

  const viewersMap = new Map<number, number>()

  for (const live of weeklyLives) {
    const g = viewersMap.get(live.room_id)
    viewersMap.set(live.room_id, Math.max(g ?? 0, live.live_info?.viewers?.peak ?? 0))
  }

  const sorted = members.map((m) => {
    const mostViewers = viewersMap.get(m.showroom_id ?? 0) ?? 0

    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = youtubeViewsFormat(mostViewers, 'id')
        break
      case 'extended':
        val = youtubeViewsFormat(mostViewers, 'id')
        break
      default:
        val = mostViewers
        break
    }

    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: mostViewers,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'MEMBER DENGAN PENONTON TERBANYAK',
    type: 'viewers',
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
