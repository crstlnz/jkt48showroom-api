import dayjs from 'dayjs'
import Schedule from '@/database/showroomDB/jkt48/Schedule'

async function getSchedule(): Promise<JKT48.Schedule[]> {
  const nextSchedule = await Schedule.find({
    date: { $gte: dayjs().startOf('day') },
  }).sort('date').select('-_id -__v').limit(10).lean()
  return nextSchedule
}

export { getSchedule }
