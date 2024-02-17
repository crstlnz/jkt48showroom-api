import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import IdolMember from '@/database/schema/48group/IdolMember'

export async function editJikosoukai(c: Context) {
  const query = c.req.query()
  const member = await IdolMember.findOneAndUpdate(
    { _id: query._id },
    {
      $set: {
        'info.jikosokai': query.jiko,
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
