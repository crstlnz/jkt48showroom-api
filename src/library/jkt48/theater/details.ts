import type { Context } from 'hono'
import type { FilterQuery } from 'mongoose'
import comparator from 'string-comparison'
import IdolMember from '@/database/schema/48group/IdolMember'
import EventDetail from '@/database/showroomDB/jkt48/EventDetail'
import JKT48NewSchedule from '@/database/showroomDB/jkt48/JKT48NewSchedule'
import Setlist from '@/database/showroomDB/jkt48/Setlist'
import { createError } from '@/utils/errorResponse'

// export async function getTheaterDetail(c: Context): Promise<IApiTheaterDetailList> {

const SIMILARITY_STRENGTH = 0.75

export function getNewTheaterUrl(code: string) {
  return `https://jkt48.com/purchase/schedule/show?code=${code}`
}

export async function getSetlist(set_list: string | undefined | null, title: string | undefined | null) {
  let setlist
  const id = title?.toLowerCase()?.replaceAll(' ', '')?.trim()
  if (set_list) {
    setlist = await Setlist.findOne({ setlist_id: set_list })
    if (title) {
      if (comparator.levenshtein.similarity(setlist?.title ?? '', title) < SIMILARITY_STRENGTH) {
        setlist = await Setlist.findOne({ id })
      }
    }
  }
  else if (title) {
    setlist = await Setlist.findOne({ id })
  }
  return setlist ?? await getEvent(set_list, title)
}

export async function getEvent(set_list: string | undefined | null, title: string | undefined | null) {
  let setlist
  const id = title?.toLowerCase()?.replaceAll(' ', '')?.trim()
  if (set_list) {
    setlist = await EventDetail.findOne({ setlist_id: set_list })
    if (title) {
      if (comparator.levenshtein.similarity(setlist?.title ?? '', title) < SIMILARITY_STRENGTH) {
        setlist = await EventDetail.findOne({ id })
      }
    }
  }
  else if (title) {
    setlist = await EventDetail.findOne({ id })
  }
  return setlist
}

export function findSetlist(data: JKT48.Setlist[], title: string, set_list_id: string) {
  let setlist = data.find(i => i?.setlist_id === set_list_id)
  if (!setlist || (setlist && comparator.levenshtein.similarity(setlist?.title ?? '', title) < SIMILARITY_STRENGTH)) {
    setlist = data.find((i) => {
      return i?.id === title.toLowerCase()?.replaceAll(' ', '')?.trim()
    })
  }
  return setlist
}

export async function getTheaterDetail(c: Context) {
  const id = c.req.param('id')
  const query: FilterQuery<JKT48.Theater>[] = [{ code: id }, { code: `OSH1-${id}` }, { code: `OSH2-${id}` }]
  if (!Number.isNaN(Number(id))) {
    query.push({ 'showroom.paid_live_id': id })
  }
  else {
    query.push({ 'idn_live.slug': id })
  }

  const data = await JKT48NewSchedule.findOne({ type: { $in: ['show', 'event'] }, $or: query })
    // .populate<{ members: JKT48.Member[] }>('members')
    // .populate<{ setlist: JKT48.Setlist }>('setlist')
    // .populate<{ seitansai: JKT48.Member[] }>('seitansai')
    // .populate<{ graduation: JKT48.Member[] }>('graduation')
    .lean()

  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })

  const memberList = data.jkt48_member

  const setlist = await getSetlist(data.set_list, data.title)

  const memberDetails = await IdolMember.find({ jkt48id: { $in: memberList.map(i => i.member_id) } }).select({
    name: 1,
    info: {
      nicknames: 1,
      img: 1,
    },
    slug: 1,
    showroom_id: 1,
    jkt48id: 1,
  }).populate('showroom').lean()

  return {
    shows: [
      {
        id: data.code,
        title: data.title,
        url: getNewTheaterUrl(data.code),
        setlist,
        members: data.jkt48_member.map((i) => {
          const detailedMember = memberDetails.find((m) => {
            return m.jkt48id?.includes(String(i.member_id))
          })
          return {
            id: i.member_id,
            name: detailedMember?.info?.nicknames?.[0] || i.name,
            img: detailedMember?.info?.img ?? undefined,
            url_key: detailedMember?.slug,
          }
        }),
        seitansai: data.birthday_member.map((i) => {
          const detailedMember = memberDetails.find((m) => {
            return m.jkt48id?.includes(String(i.member_id))
          })
          return {
            id: i.member_id,
            name: detailedMember?.info?.nicknames?.[0] || i.name,
            img: detailedMember?.info?.img ?? undefined,
            url_key: detailedMember?.slug,
          }
        }),
        graduation: data.graduation_member?.map((i) => {
          const detailedMember = memberDetails.find((m) => {
            return m.jkt48id?.includes(String(i.member_id))
          })
          return {
            id: i.member_id,
            name: detailedMember?.info?.nicknames?.[0] || i.name,
            img: detailedMember?.info?.img ?? undefined,
            url_key: detailedMember?.slug,
          }
        }),
        date: data.start_time ?? data.date,
        showroomTheater: data.showroom,
        idnTheater: data.idn_live,
      },
    ],
    date: new Date(data?.date ?? 0).toISOString(),
  }
}
