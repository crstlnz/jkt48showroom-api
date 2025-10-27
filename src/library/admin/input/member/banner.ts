import type { Context } from 'hono'
import IdolMember from '@/database/schema/48group/IdolMember'
import { uploadImageBuffer } from '@/utils/cloudinary'
import { createError } from '@/utils/errorResponse'

export async function setBanner(c: Context): Promise<{
  url: string
  status: number
}> {
  const body = await c.req.parseBody()
  if (!body.id) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  if (!body.banner) throw createError({ statusCode: 400, statusMessage: 'Banner not included!' })
  const member = await IdolMember.findOne({ _id: body.id })
  if (!member) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  const img = await uploadImageBuffer(await (body.banner as File).arrayBuffer())
  member.info.banner = img.secure_url
  await member.save()
  return {
    url: img.secure_url,
    status: 200,
  }
}
