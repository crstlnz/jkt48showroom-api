import type { Context } from 'hono'
import type { FilterQuery } from 'mongoose'
import Theater from '@/database/showroomDB/jkt48/Theater'
import Setlist from '@/database/showroomDB/jkt48/Setlist'
import IdolMember from '@/database/schema/48group/IdolMember'

export async function getTheaterList(page: number, perpage: number, options?: FilterQuery<JKT48.Theater>): Promise<IApiTheaterInfo[]> {
  const theater = await Theater.find(options ?? {}).limit(perpage).skip((page - 1) * perpage).sort('-date').select('title date label id setlistId memberIds seitansaiIds').lean()
  const setlists = theater.reduce((a, b) => a.add(b.setlistId), new Set<string>())
  const setlistData = await Setlist.find({ id: [...setlists.values()] }).lean()
  const seitansai = theater.reduce((a, b) => {
    if (b.seitansaiIds?.length) {
      for (const m of b.seitansaiIds) {
        a.add(String(m))
      }
    }
    return a
  }, new Set())

  let memberDetailData: IdolMember[]
  if (seitansai.size > 0) {
    console.log([...seitansai.values()])
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
      }).populate('showroom')
      .lean()
  }

  return theater.map((i) => {
    const setlist = setlistData.find(s => s.id === i.setlistId)
    return {
      id: i.id,
      title: i.title.trim(),
      banner: setlist?.banner,
      poster: setlist?.poster,
      member_count: i.memberIds.length ?? 0,
      seitansai: i.seitansaiIds?.length
        ? i.seitansaiIds.map((i) => {
          const member = memberDetailData?.find(m => m.jkt48id?.includes(String(i)))
          return {
            id: i,
            name: member?.name || member?.info?.nicknames?.[0] || '',
            img: member?.info?.img ?? undefined,
            url_key: member?.slug,
          }
        })
        : undefined,
      url: i.id?.split('-')?.[0],
      date: i.date,
    }
  })
}

export async function getTheater(c: Context): Promise<IApiTheater> {
  const maxPerpage = 30
  let page = Number(c.req.query('page')) || 1
  let perpage = Number(c.req.query('perpage')) || 10
  if (perpage > maxPerpage) perpage = maxPerpage
  const total = await Theater.countDocuments({})
  const maxPage = Math.ceil(total / perpage)
  if (page < 1) page = 1
  if (page > maxPage) page = maxPage
  const theaterList = await getTheaterList(page, perpage)
  return {
    theater: theaterList,
    page,
    perpage,
    total_count: total,
  }
}

export async function getTheaterById(id: string): Promise<JKT48.Theater | null> {
  return await Theater.findOne({ id }).lean()
}
