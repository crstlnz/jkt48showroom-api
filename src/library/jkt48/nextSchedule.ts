import dayjs from 'dayjs'
import JKT48NewSchedule from '@/database/showroomDB/jkt48/JKT48NewSchedule'

async function getSchedule(): Promise<JKT48.Schedule[]> {
  const nextSchedule = await JKT48NewSchedule.find({
    date: { $gte: dayjs().startOf('day') },
  }).sort('date').limit(10).lean()
  return nextSchedule.map((data) => {
    return {
      id: String(data.schedule_id),
      date: data.start_time ?? data.date ?? new Date(0),
      code: data.code ?? undefined,
      category: data.type,
      title: data.title,
      url: data.link,
    }
  })
}

export { getSchedule }
