import type { Context } from 'hono'
import EventDetail from '@/database/showroomDB/jkt48/EventDetail'

export default async function deleteEvent(c: Context): Promise<{ success: true }> {
  const id = c.req.param('id')
  await EventDetail.deleteOne({ _id: id })
  return {
    success: true,
  }
}
