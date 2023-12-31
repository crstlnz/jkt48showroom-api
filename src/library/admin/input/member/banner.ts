import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import Member from '@/database/schema/48group/Member'
import { uploadImageBuffer } from '@/utils/cloudinary'

export async function setBanner(c: Context): Promise<{
  url: string
  status: number
}> {
  const body = await c.req.parseBody()
  if (!body.id) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  if (!body.banner) throw createError({ statusCode: 400, statusMessage: 'Banner not included!' })
  const member = await Member.findOne({ _id: body.id })
  if (!member) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  const img = await uploadImageBuffer(await (body.banner as File).arrayBuffer())
  member.banner = img.secure_url
  await member.save()
  return {
    url: img.secure_url,
    status: 200,
  }
}
