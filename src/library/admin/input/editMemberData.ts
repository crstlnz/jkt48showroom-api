import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function editMemberData(c: Context) {
  const query = c.req.query()
  const data = {
    name: query.name,
    img: query.img,
    stage48: query.stage48,
    banner: query.banner,
    jikosokai: query.jikosokai,
    group: query.group,
    generation: query.generation,
    jkt48id: query.jkt48id,
  }

  const member = await Member.findOneAndUpdate(
    { _id: query._id },
    {
      $set: data,
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
