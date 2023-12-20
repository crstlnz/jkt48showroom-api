import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import Member from '@/database/schema/48group/Member'
import { uploadImageBuffer } from '@/utils/cloudinary'

export async function setImage(c: Context): Promise<{
  url: string
  status: number
}> {
  const body = await c.req.parseBody()
  if (!body.id) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  if (!body.image) throw createError({ statusCode: 400, statusMessage: 'Image not included!' })
  const member = await Member.findOne({ _id: body.id })
  if (!member) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  const img = await uploadImageBuffer(await (body.image as File).arrayBuffer())
  member.img = img.secure_url
  await member.save()
  return {
    url: img.secure_url,
    status: 200,
  }
}
