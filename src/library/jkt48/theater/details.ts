import type { Context } from 'hono'
import type { FilterQuery } from 'mongoose'
import IdolMember from '@/database/schema/48group/IdolMember'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { createError } from '@/utils/errorResponse'

export async function getTheaterDetail(c: Context): Promise<IApiTheaterDetailList> {
  const id = c.req.param('id')
  console.log(id)
  const query: FilterQuery<JKT48.Theater>[] = [{ id: { $regex: new RegExp(`^(${id}|^${id}(?:-\\d+))$`) } }]
  if (!Number.isNaN(Number(id))) {
    query.push({ 'showroomTheater.paid_live_id': id })
  }
  else {
    query.push({ 'idnTheater.slug': id })
  }

  const data = await Theater.find({ $or: query })
    .populate<{ members: JKT48.Member[] }>('members')
    .populate<{ setlist: JKT48.Setlist }>('setlist')
    .populate<{ seitansai: JKT48.Member[] }>('seitansai')
    .populate<{ graduation: JKT48.Member[] }>('graduation')
    .lean()

  const memberList = data.reduce<JKT48.Member[]>((a, b) => {
    a.push(...b.members)
    a.push(...b.graduation)
    a.push(...b.seitansai)
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
  return {
    shows: data.map((i) => {
      console.log('Data:', i.idnTheater)
      return {
        id: i.id,
        title: i.title,
        url: i.url,
        setlist: i.setlist,
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
        seitansai: i.seitansai.map((i) => {
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
        graduation: i.graduation.map((i) => {
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
        date: i.date,
        team: i.team,
        showroomTheater: i.showroomTheater,
        idnTheater: i.idnTheater,
      }
    }),
    date: new Date(data[0]?.date).toISOString(),
  }
}
