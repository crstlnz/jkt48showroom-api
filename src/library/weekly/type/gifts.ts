import dayjs from 'dayjs'
import type { FormatType, LivePlatform, WeeklyData } from '..'
import { getMember, getOneWeekLives } from '../query'
import { Rupiah } from '@/utils/format'

export default async function weeklyGift(type: LivePlatform, format: FormatType): Promise<WeeklyData> {
  const members = await getMember()
  const weeklyLives = await getOneWeekLives(members, type)

  const giftsMap = new Map<number, { val: number, gold: number }>()
  for (const live of weeklyLives) {
    const g = giftsMap.get(live.room_id)
    giftsMap.set(live.room_id, { val: (live.gift_rate * live.total_gifts) + (g?.val ?? 0), gold: live.total_gifts + (g?.gold ?? 0) })
  }

  const sorted = members.map((m) => {
    const gift = giftsMap.get(m.showroom_id ?? 0)
    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = Rupiah.format(gift?.val ?? 0)
        break
      case 'extended':
        if (type === 'all') {
          val = Rupiah.format(gift?.val ?? 0)
        }
        else {
          val = `${gift?.gold ?? 0}G (± ${Rupiah.format(gift?.val ?? 0)})`
        }
        break
      default:
        val = gift?.val ?? 0
        break
    }

    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: gift?.val ?? 0,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'MEMBER DENGAN GIFT TERBANYAK',
    type: 'gift',
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
