import dayjs from 'dayjs'
import type { FormatType, LivePlatform, WeeklyData } from '..'
import { getMember, getOneWeekLives } from '../query'
import { durationFormat } from '@/utils/format'

export default async function weeklyDuration(type: LivePlatform, format: FormatType): Promise<WeeklyData> {
  const members = await getMember()
  const weeklyLives = await getOneWeekLives(members, type)

  const durationMap = new Map<number, number>()

  for (const live of weeklyLives) {
    const g = durationMap.get(live.room_id)
    durationMap.set(live.room_id, Math.max(g ?? 0, live.live_info.duration ?? 0))
  }

  const sorted = members.map((m) => {
    const longestDuration = durationMap.get(m.showroom_id ?? 0) ?? 0
    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = durationFormat(longestDuration, { second: false })
        break
      case 'extended':
        val = durationFormat(longestDuration, { })
        break
      default:
        val = longestDuration
        break
    }
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: longestDuration,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'MEMBER PALING LAMA LIVE',
    type: 'duration',
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
