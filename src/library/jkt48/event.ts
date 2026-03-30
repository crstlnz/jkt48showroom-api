import dayjs from 'dayjs'
import JKT48NewSchedule from '@/database/showroomDB/jkt48/JKT48NewSchedule'
import { getTheaterList } from './theater'

export default async function getEvents(): Promise<IApiEvent> {
  const theaterList = await getTheaterList(1, 20, {
    date: {
      $gte: dayjs().subtract(2, 'hour'),
    },
  })

  const recentTheater = await getTheaterList(1, 6, {
    date: {
      $lt: dayjs().subtract(2, 'hour'),
    },
  })

  const nextSchedule = await JKT48NewSchedule.find({
    type: { $nin: ['show'] },
    date: { $gte: dayjs().startOf('day') },
  }).sort('date').limit(10).lean()

  return {
    theater: {
      upcoming: theaterList.theater.sort((a, b) => a.date.getTime() - b.date.getTime()),
      recent: recentTheater.theater,
    },
    other_schedule: nextSchedule.map((data) => {
      return {
        id: String(data.schedule_id),
        date: data.start_time ?? data.date ?? new Date(0),
        code: data.code ?? undefined,
        category: data.type,
        title: data.title,
        url: data.link,
      }
    }),
  }
}
