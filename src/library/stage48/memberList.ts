import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function getMember48List(group: string | null = null): Promise<ISortMember[]> {
  const options = group ? { group } : {}
  const data = await Member.find(options)
  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  return data.map((i) => {
    return {
      id: i._id.toString(),
      name: i.name,
      generation: i.generation,
      is_graduate: i.isGraduate,
      img: i.img,
    }
  },
  )
}
