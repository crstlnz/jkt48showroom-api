import dayjs from 'dayjs'
import { getTheaterList } from './theater'
import Schedule from '@/database/showroomDB/jkt48/Schedule'

export default async function getEvents(): Promise<IApiEvent> {
  const theaterList = await getTheaterList(1, 20, {
    date: {
      $gte: dayjs().subtract(2, 'hour'),
    },
  })

  const recentTheater = await getTheaterList(1, 4, {
    date: {
      $lt: dayjs().subtract(2, 'hour'),
    },
  })

  const nextSchedule = await Schedule.find({
    url: {
      $not: /^\/theater\//,
    },
    date: { $gte: dayjs().startOf('day') },
  }).sort('date').select('-_id -__v').limit(10).lean()

  return {
    theater: {
      upcoming: theaterList.sort((a, b) => a.date.getTime() - b.date.getTime()),
      recent: recentTheater,
    },
    other_schedule: nextSchedule,
  }
}
