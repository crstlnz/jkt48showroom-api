import type { FormatType, WeeklyData } from '..'
import dayjs from 'dayjs'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { getMember } from '../query'

export default async function totalTheater(format: FormatType): Promise<WeeklyData> {
  const members = await getMember()

  const theaters = await Theater.find({
    date: {
      $gte: dayjs().subtract(7, 'day').startOf('day'),
    },
  })

  const sorted = members.map((m) => {
    const theaterCount = theaters.filter(i => m.jkt48id?.some(id => i.memberIds.includes(id))).length

    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = `${theaterCount}x`
        break
      case 'extended':
        val = `${theaterCount}x`
        break
      default:
        val = theaterCount
        break
    }
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
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
