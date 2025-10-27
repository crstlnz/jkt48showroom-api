import type { Context } from 'hono'
import IdolMember from '@/database/schema/48group/IdolMember'
import { createError } from '@/utils/errorResponse'

export async function setGraduate(c: Context) {
  const query = c.req.query()
  const id = query.id
  const value = query.value === 'true'
  if (!id) throw createError({ statusCode: 400, message: 'Bad request!' })
  const member = await IdolMember.findOne({ _id: id })
  if (!member) throw createError({ statusCode: 400, message: 'Bad request!' })
  member.info.is_graduate = value
  await member.save()
  return {
    code: 200,
    message: 'Request success!',
  }
}
