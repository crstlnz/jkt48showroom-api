import type { Context } from 'hono'
import Member from '@/database/schema/48group/Member'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { createError } from '@/utils/errorResponse'

export async function getTheaterDetail(c: Context): Promise<IApiTheaterDetailList> {
  const id = c.req.param('id')
  const data = await Theater.find({ id: new RegExp(`^${id}`) })
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

  const memberDetails = await Member.find({ jkt48id: { $in: memberList.map(i => i.id) } }).select({
    name: 1,
    nicknames: 1,
    img: 1,
    showroom_id: 1,
    jkt48id: 1,
  }).populate('showroom')
    .lean()

  if (!data?.length) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  return {
    shows: data.map((i) => {
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
            name: detailedMember?.nicknames?.[0] || i.name,
            img: detailedMember?.img ?? undefined,
            url_key: (detailedMember as any)?.showroom?.url,
          }
        }),
        seitansai: i.seitansai.map((i) => {
          const detailedMember = memberDetails.find((m) => {
            return m.jkt48id?.includes(i.id)
          })
          return {
            id: i.id,
            name: detailedMember?.nicknames?.[0] || i.name,
            img: detailedMember?.img ?? undefined,
            url_key: (detailedMember as any)?.showroom?.url,
          }
        }),
        graduation: i.graduation.map((i) => {
          const detailedMember = memberDetails.find((m) => {
            return m.jkt48id?.includes(i.id)
          })
          return {
            id: i.id,
            name: detailedMember?.nicknames?.[0] || i.name,
            img: detailedMember?.img ?? undefined,
            url_key: (detailedMember as any)?.showroom?.url,
          }
        }),
        date: i.date,
        team: i.team,
      }
    }),
    date: new Date(data[0]?.date).toISOString(),
  }
}
