import type { Context } from 'hono'
import IdolMember from '@/database/schema/48group/IdolMember'
import { createError } from '@/utils/errorResponse'

export async function editJKT48ID(c: Context) {
  const query = await c.req.parseBody()
  const jkt48ids = query['jkt48id[]']
  const member = await IdolMember.findOneAndUpdate(
    { _id: query._id },
    {
      $set: {
        jkt48id: jkt48ids,
      },
    },
    {
      runValidators: true,
    },
  )

  if (member == null) throw createError({ statusCode: 500, message: 'Failed!' })
  return {
    code: 200,
    message: 'Request success!',
  }
}
