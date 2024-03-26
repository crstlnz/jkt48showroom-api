import type { Context } from 'hono'
import type { AnyKeys, AnyObject } from 'mongoose'
import { createError } from '@/utils/errorResponse'
import { uploadImageBuffer } from '@/utils/cloudinary'
import IdolMember from '@/database/schema/48group/IdolMember'

export async function editMemberData(c: Context) {
  const query = await c.req.parseBody()
  console.log(query)
  const banner = query.banner instanceof File ? await uploadImageBuffer(await (query.banner as File).arrayBuffer()) : query.banner
  const img = query.img instanceof File ? await uploadImageBuffer(await (query.img as File).arrayBuffer()) : query.img
  const infoData: Partial<IdolMember['info']> = {
    img,
    banner,
    jikosokai: query.jikosokai?.toString(),
    generation: query.generation?.toString(),
    nicknames: query['nicknames[]'] as any,
    birthdate: query.birthdate ? new Date(query.birthdate.toString()) : undefined,
  }

  const data: AnyKeys<IdolMember> & AnyObject = {
    name: query.name.toString(),
    stage48: query.stage48?.toString(),
    group: query.group?.toString() as GroupType,
    jkt48id: query['jkt48id[]'] as any,
    idn: {
      username: query.idn_username?.toString(),
    },
    slug: query.slug?.toString(),
  }

  const missingSR = query['live_data.missing.showroom']
  const missingIDN = query['live_data.missing.idn']
  if (missingSR || missingIDN) {
    data.live_data = {
      missing: {
        showroom: Number(missingSR) || 0,
        idn: Number(missingIDN) || 0,
      },
    }
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
    data['info.socials'] = socials as IdolMember['info']['socials']
  }

  // because if nested object not using string key like "info.generation" , update query will update the nested object entirely (in case if you want update some field only)
  for (const key of Object.keys(infoData)) {
    data[`info.${key}`] = infoData[key as keyof IdolMember['info']]
  }

  const member = await IdolMember.findOneAndUpdate(
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
