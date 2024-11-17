import dayjs from 'dayjs'
import type { WeeklyData } from '..'
import { getMember } from '../query'
import Theater from '@/database/showroomDB/jkt48/Theater'

export default async function totalTheater(): Promise<WeeklyData> {
  const members = await getMember()

  const theaters = await Theater.find({
    date: {
      $gte: dayjs().subtract(7, 'day').startOf('day'),
    },
  })

  const sorted = members.map((m) => {
    const theaterCount = theaters.filter(i => m.jkt48id?.some(id => i.memberIds.includes(id))).length
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: `${theaterCount}x`,
      num_value: theaterCount,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'MEMBER PALING RAJIN THEATER',
    type: 'theater',
    date: dayjs().toISOString(),
    data: sorted.map((d) => {
      return {
        ...d,
        num_value: undefined,
      }
    }),
  }
}
