import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function editMemberData(c: Context) {
  const query = await c.req.parseBody()
  const data: Partial<Database.I48Member> = {
    name: query.name,
    img: query.img,
    stage48: query.stage48,
    banner: query.banner,
    jikosokai: query.jikosokai,
    group: query.group,
    generation: query.generation,
    jkt48id: query['jkt48id[]'],
    nicknames: query['nicknames[]'],
    idn_username: query.idn_username,
  }

  const rawSocials = query['socials[]']
  if (rawSocials) {
    const socials = []
    for (const s of rawSocials) {
      try {
        socials.push(JSON.parse(s))
      }
      catch (e) {
        throw createError({ status: 400, message: 'Data parse error!' })
      }
    }

    if (socials[0] && (!('url' in socials[0]) || !('title' in socials[0]))) throw createError({ status: 400, message: 'Data is wrong!' })
    data.socials = socials
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
