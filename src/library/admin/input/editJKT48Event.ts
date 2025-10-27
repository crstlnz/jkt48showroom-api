import type { Context } from 'hono'
import JKT48Event from '@/database/showroomDB/jkt48/JKT48Event'
import { streamToString } from '@/utils'
import { notFound } from '@/utils/errorResponse'

export async function editJKT48Event(c: Context) {
  const body = JSON.parse(await streamToString(c.req.raw.body!))
  const eventData = await JKT48Event.findOne({ id: body._id })
  if (!eventData) throw notFound()

  const newData = {
    id: body.id,
    eventId: body?.eventId ?? eventData.eventId,
    url: body?.url ?? eventData.url,
    memberIds: body?.memberIds?.map((i: any) => Number(i)) ?? eventData.memberIds,
  }

  await JKT48Event.updateOne({
    id: body._id,
  }, {
    $set: newData,
  })

  return newData
}
