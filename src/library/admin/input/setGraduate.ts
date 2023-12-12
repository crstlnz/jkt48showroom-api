import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function setGraduate(c: Context) {
  const query = c.req.query()
  const id = query.id
  const value = query.value === 'true'
  if (!id) throw createError({ statusCode: 400, message: 'Bad request!' })
  const member = await Member.findOne({ _id: id })
  if (!member) throw createError({ statusCode: 400, message: 'Bad request!' })
  member.isGraduate = value
  await member.save()
  return {
    code: 200,
    message: 'Request success!',
  }
}
