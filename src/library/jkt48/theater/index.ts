import type { Context } from 'hono'
import type { FilterQuery } from 'mongoose'
import IdolMember from '@/database/schema/48group/IdolMember'
import JKT48NewSchedule from '@/database/showroomDB/jkt48/JKT48NewSchedule'
import Setlist from '@/database/showroomDB/jkt48/Setlist'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { notFound } from '@/utils/errorResponse'

export async function getTheaterList(page: number, perpage: number, query?: FilterQuery<JKT48Web.Schedule>): Promise<{ theater: IApiTheaterInfo[], page: number, perpage: number, total_count: number }> {
  const q: FilterQuery<JKT48Web.Schedule> = { type: 'show', ...query }
  const total = await JKT48NewSchedule.countDocuments(q)
  const theater = await JKT48NewSchedule.find(q).limit(perpage).skip((page - 1) * perpage).sort('-date').select('title date id jkt48_member birthday_member code').lean()
  const setlists = theater.reduce((a, b) => a.add(b.set_list ?? b.title.toLowerCase().replaceAll(' ', '')), new Set<string>())
  const setlistData = await Setlist.find({ $or: [{ id: [...setlists.values()] }, { setlist_id: [...setlists.values()] }] }).lean()
  const seitansai = theater.reduce((a, b) => {
    if (b.birthday_member?.length) {
      for (const m of b.birthday_member) {
        a.add(String(m.member_id))
      }
    }
    return a
  }, new Set())

  let memberDetailData: IdolMember[]
  if (seitansai.size > 0) {
    memberDetailData = await IdolMember.find({ jkt48id: { $in: [...seitansai.values()] } })
      .select({
        name: 1,
        info: {
          nicknames: 1,
          img: 1,
        },
        slug: 1,
        showroom_id: 1,
        jkt48id: 1,
      })
      .populate('showroom')
      .lean()
  }

  return {
    theater: theater.map((i) => {
      const setlist = setlistData.find(s => s.id === i.title.toLowerCase().replaceAll(' ', '') || s.setlist_id === i.set_list)
      const birthdayMember = i.birthday_member?.map((s) => {
        const data = memberDetailData.find(m => m.jkt48id?.includes(String(s.member_id)))
        return {
          id: String(s.member_id),
          name: data?.info.nicknames?.[0] ?? s.name,
          img: data?.info?.img ?? '',
          url_key: data?.slug ?? '',
        }
      })
      return {
        id: i.code,
        title: i.title.trim(),
        banner: setlist?.banner,
        poster: setlist?.poster,
        member_count: i.jkt48_member?.length ?? 0,
        seitansai: birthdayMember?.length > 0 ? birthdayMember : undefined,
        url: i.code,
        date: i.date ?? new Date(0),
      }
    }),
    page,
    perpage,
    total_count: total,
  }
}

export async function getTheater(c: Context): Promise<IApiTheater> {
  const maxPerpage = 30
  let page = Number(c.req.query('page')) || 1
  let perpage = Number(c.req.query('perpage')) || 10
  if (perpage > maxPerpage) perpage = maxPerpage
  const query: Parameters<typeof JKT48NewSchedule.countDocuments> = [{ type: 'show' }]
  const total = await JKT48NewSchedule.countDocuments(...query)
  const maxPage = Math.ceil(total / perpage)
  if (page < 1) page = 1
  if (page > maxPage) page = maxPage
  return await getTheaterList(page, perpage)
}

export async function getTheaterById(id: string): Promise<JKT48.Theater | null> {
  const data = await JKT48NewSchedule.findOne({ code: id }).lean()
  if (!data) throw notFound()
  return {
    id: data.code,
    date: data?.start_time ?? new Date(0),
    title: data?.title,
    url: `https://jkt48.com/purchase/schedule/show?code=${data.code}`,
    setlistId: data?.set_list ?? '',
    team: undefined,
    memberIds: data.jkt48_member.map(i => String(i.member_id)),
    seitansaiIds: data.birthday_member?.map(i => String(i.member_id)),
    graduationIds: data.graduation_member?.map(i => String(i.member_id)),
  }
}
