import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function editJikosoukai(c: Context) {
  const query = c.req.query()
  const member = await Member.findOneAndUpdate(
    { _id: query._id },
    {
      $set: {
        jikosokai: query.jiko,
      },
    },
    {
      runValidators: true,
    },
  )

  if (member == null) throw createError({ statusCode: 400, message: 'Bad request!' })
  return {
    code: 200,
    message: 'Request success!',
  }
}
