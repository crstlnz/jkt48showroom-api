import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import IdolMember from '@/database/schema/48group/IdolMember'

export async function getMember48List(c: Context): Promise<ISortMember[]> {
  const group = c.req.query('group')
  const options = group ? { group } : {}
  const data = await IdolMember.find(options)
  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  return data.map((i) => {
    return {
      id: i._id.toString(),
      name: i.name,
      generation: i.info.generation,
      is_graduate: i.info.is_graduate ?? true,
      img: i.info.img,
    }
  },
  )
}
