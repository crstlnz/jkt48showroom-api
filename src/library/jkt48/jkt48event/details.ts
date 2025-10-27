import type { Context } from 'hono'
import type { FilterQuery } from 'mongoose'
import IdolMember from '@/database/schema/48group/IdolMember'
import JKT48Event from '@/database/showroomDB/jkt48/JKT48Event'
import { createError } from '@/utils/errorResponse'

export async function getJKT48EventDetail(c: Context): Promise<IApiJKT48EventDetail> {
  const id = c.req.param('id')
  const query: FilterQuery<JKT48.Theater>[] = [{ id: { $regex: new RegExp(`^(${id}|^${id}(?:-\\d+))$`) } }]
  if (!Number.isNaN(Number(id))) {
    query.push({ 'showroomTheater.paid_live_id': id })
  }
  else {
    query.push({ 'idnTheater.slug': id })
  }

  const data = await JKT48Event.find({ $or: query })
    .populate<{ members: JKT48.Member[] }>('members')
    .populate<{ event: JKT48.EventDetail }>('event')
    .lean()

  console.log(data)

  const memberList = data.reduce<JKT48.Member[]>((a, b) => {
    a.push(...b.members)
    return a
  }, [])

  const memberDetails = await IdolMember.find({ jkt48id: { $in: memberList.map(i => i.id) } }).select({
    name: 1,
    info: {
      nicknames: 1,
      img: 1,
    },
    slug: 1,
    showroom_id: 1,
    jkt48id: 1,
  }).populate('showroom').lean()

  if (!data?.length) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  const i = data[0]
  return {
    id: i.id,
    title: i.title,
    url: i.url,
    members: i.members.map((i) => {
      const detailedMember = memberDetails.find((m) => {
        return m.jkt48id?.includes(i.id)
      })
      return {
        id: i.id,
        name: detailedMember?.info?.nicknames?.[0] || i.name,
        img: detailedMember?.info?.img ?? undefined,
        url_key: detailedMember?.slug,
      }
    }),
    event: i.event,
    team: i.team,
    showroomTheater: i.showroomTheater,
    idnTheater: i.idnTheater,
    date: new Date(data[0]?.date),
  }
}
