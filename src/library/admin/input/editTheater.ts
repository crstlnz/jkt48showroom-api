import type { Context } from 'hono'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { streamToString } from '@/utils'
import { notFound } from '@/utils/errorResponse'

export async function editTheater(c: Context) {
  const body = JSON.parse(await streamToString(c.req.raw.body!))
  const theaterData = await Theater.findOne({ id: body._id })
  if (!theaterData) throw notFound()

  const newData = {
    id: body.id,
    setlistId: body?.setlistId ?? theaterData.setlistId,
    url: body?.url ?? theaterData.url,
    seitansaiIds: body?.seitansaiIds?.map((i: any) => Number(i)) ?? theaterData.seitansaiIds,
    graduationIds: body?.graduationIds?.map((i: any) => Number(i)) ?? theaterData.graduationIds,
    memberIds: body?.memberIds?.map((i: any) => Number(i)) ?? theaterData.memberIds,
  }

  await Theater.updateOne({
    id: body._id,
  }, {
    $set: newData,
  })

  return newData
}
