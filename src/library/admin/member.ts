import type { Context } from 'hono'
import Showroom from '@/database/schema/showroom/Showroom'

export async function getMembers(c: Context): Promise<Admin.IShowroomMember[]> {
  try {
    const group = c.req.query('group')
    const members = await Showroom.find(group ? { group } : {})
      .populate({
        path: 'member_data',
      })
      .lean()

    return (members as unknown as Admin.IShowroomMember[])
      .map((i) => {
        if (!i.member_data) i.member_data = null
        return i
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.error(e)
    return []
  }
}
