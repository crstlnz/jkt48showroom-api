import dayjs from 'dayjs'
import type { LivePlatform, WeeklyData } from '..'
import { getMember, getOneWeekLives } from '../query'
import { durationFormat } from '@/utils/format'

export default async function weeklyDuration(type: LivePlatform): Promise<WeeklyData> {
  const members = await getMember()
  const weeklyLives = await getOneWeekLives(members, type)

  const durationMap = new Map<number, number>()

  for (const live of weeklyLives) {
    const g = durationMap.get(live.room_id)
    durationMap.set(live.room_id, Math.max(g ?? 0, live.live_info.duration ?? 0))
  }

  const sorted = members.map((m) => {
    const longestDuration = durationMap.get(m.showroom_id ?? 0) ?? 0
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: durationFormat(longestDuration, { second: false }),
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
