import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'
import { uploadImageBuffer } from '@/utils/cloudinary'

export async function editMemberData(c: Context) {
  const query = await c.req.parseBody()
  const banner = query.banner instanceof File ? await uploadImageBuffer(await (query.banner as File).arrayBuffer()) : query.banner
  const img = query.img instanceof File ? await uploadImageBuffer(await (query.img as File).arrayBuffer()) : query.img
  const data: Partial<Database.I48Member> = {
    name: query.name.toString(),
    img,
    banner,
    stage48: query.stage48.toString(),
    jikosokai: query.jikosokai.toString(),
    group: query.group.toString(),
    generation: query.generation.toString(),
    jkt48id: query['jkt48id[]'] as any,
    nicknames: query['nicknames[]'] as any,
    idn_username: query.idn_username.toString(),
  }

  const rawSocials = query['socials[]'] as any[]
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
