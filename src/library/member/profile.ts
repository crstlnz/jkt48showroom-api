import Showroom from '@schema/showroom/Showroom'
import { getSousenkyoMembers } from '../jkt48/scraper/sousenkyo'
import { createError } from '@/utils/errorResponse'
import Theater from '@/database/showroomDB/jkt48/Theater'
import LiveLog from '@/database/live/schema/LiveLog'
import IdolMember from '@/database/schema/48group/IdolMember'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'

export async function getMemberDetails(slug: string): Promise<IMemberProfileAPI> {
  let data = await IdolMember.findOne({ slug }).populate<{ showroom: Database.IShowroomMember }>('showroom').lean()
  if(!data) {
    const sr = await Showroom.findOne({url : slug})
    if (!sr) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
    data = await IdolMember.findOne({ showroom_id : sr.room_id }).populate<{ showroom: Database.IShowroomMember }>('showroom').lean()
    if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  }

  let recentTheater: ITheaterAPI[] = []
  let upcomingTheater: ITheaterAPI[] = []

  // const sousenkyoData = await getSousenkyoMembers()

  if (data.group === 'jkt48' && data.jkt48id) {
    const next = await Theater.find({ memberIds: { $in: data.jkt48id }, date: { $gte: new Date() } }).populate<{ setlist: JKT48.Setlist }>('setlist').sort({ date: -1 }).limit(4)
    const theater = await Theater.find({ memberIds: { $in: data.jkt48id }, date: { $lte: new Date() } }).populate<{ setlist: JKT48.Setlist }>('setlist').sort({ date: -1 }).limit(4)
    recentTheater = theater.map<ITheaterAPI>((i) => {
      return {
        id: i.id,
        name: i.title,
        date: i.date.toISOString(),
        url: i.url,
        poster: i.setlist?.poster,
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    upcomingTheater = next.map<ITheaterAPI>((i) => {
      return {
        id: i.id,
        name: i.title,
        date: i.date.toISOString(),
        url: i.url,
        poster: i.setlist?.poster,
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const most_gift = !data.showroom_id
    ? null
    : await LiveLog.findOne({ room_id: data.showroom_id, is_dev: false }).select({
      data_id: 1,
      c_gift: 1,
    }).sort({ c_gift: -1 }).catch(() => null)

  const last_live = !data.showroom_id
    ? null
    : await LiveLog.findOne({ room_id: data.showroom_id, is_dev: false }).select({
      'data_id': 1,
      'live_info.date': 1,
      'created_at': 1,
    }).sort({ created_at: -1 }).catch(() => null)

  const longest_live = !data.showroom_id
    ? null
    : await LiveLog.findOne({ room_id: data.showroom_id, is_dev: false }).select({
      'data_id': 1,
      'live_info.duration': 1,
    }).sort({
      'live_info.duration': -1,
    }).catch(() => null)

  return {
    name: data.name,
    stats: {
      missing: {
        showroom: data?.live_data?.missing?.showroom || 0,
        idn: data?.live_data?.missing?.idn || 0,
      },
      total_live: {
        showroom: data.showroom_id ? await LiveLog.countDocuments({ room_id: data.showroom_id, type: 'showroom', is_dev: false }).catch(() => 0) : 0,
        idn: data.showroom_id ? await LiveLog.countDocuments({ room_id: data.showroom_id, type: 'idn', is_dev: false }).catch(() => 0) : 0,
      },
      most_gift: most_gift
        ? {
            id: most_gift.data_id,
            gift: most_gift.c_gift,
          }
        : undefined,
      longest_live: longest_live
        ? {
            id: longest_live.data_id,
            duration: longest_live.live_info?.duration,
          }
        : undefined,
      last_live: last_live
        ? {
            id: last_live.data_id,
            date: {
              start: last_live.live_info?.date?.start?.toISOString() || '',
              end: last_live.live_info?.date?.end?.toISOString() || '',
            },
          }
        : undefined,
    },
    nickname: data.info?.nicknames?.length ? data.info.nicknames[0] : undefined,
    fullname: data.name ?? 'No name!',
    img: data.showroom?.img,
    img_alt: data.info?.img ?? data.showroom?.img_square ?? data.showroom?.img,
    banner: data.info?.banner ?? '',
    description: data?.showroom?.description ?? data.info?.description ?? '',
    group: data.group ?? '',
    jikosokai: data.info?.jikosokai ?? '',
    generation: data.info?.generation,
    showroom_id: data.showroom_id,
    showroom_exists: data.showroom?.room_exists,
    profile_video: data.info?.profile_video,
    socials: data.info?.socials ?? [],
    is_graduate: data.info?.is_graduate ?? false,
    bloodType: data.info?.blood_type,
    height: data.info?.height,
    is_group: data.showroom?.is_group ?? false,
    url: data.slug ?? data.showroom?.url,
    birthdate: data.info?.birthdate,
    // sousenkyo: sousenkyoData?.find(s => data.jkt48id?.includes(s.id)),
    recentTheater,
    upcomingTheater,
  }
}

export async function oldGetMemberDetails(key: string): Promise<IMemberProfileAPI> {
  const data = await Showroom.findOne({ url: key })
    .populate({
      path: 'member_data',
      select: 'img isGraduate banner jikosokai socials birthdate name nicknames height bloodType jkt48id live_data',
    })
    .lean()

  if (!data) throw createError({ statusMessage: `Data not found!`, statusCode: 404 })
  let recentTheater: ITheaterAPI[] = []
  let upcomingTheater: ITheaterAPI[] = []

  if (data.group === 'jkt48') {
    const next = await Theater.find({ memberIds: { $in: data.member_data?.jkt48id }, date: { $gte: new Date() } }).populate<{ setlist: JKT48.Setlist }>('setlist').sort({ date: -1 }).limit(4)
    const theater = await Theater.find({ memberIds: { $in: data.member_data?.jkt48id }, date: { $lte: new Date() } }).populate<{ setlist: JKT48.Setlist }>('setlist').sort({ date: -1 }).limit(4)
    recentTheater = theater.map<ITheaterAPI>((i) => {
      return {
        id: i.id,
        name: i.title,
        date: i.date.toISOString(),
        url: i.url,
        poster: i.setlist?.poster,
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    upcomingTheater = next.map<ITheaterAPI>((i) => {
      return {
        id: i.id,
        name: i.title,
        date: i.date.toISOString(),
        url: i.url,
        poster: i.setlist?.poster,
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const most_gift = await LiveLog.findOne({ room_id: data.room_id, is_dev: false }).select({
    data_id: 1,
    c_gift: 1,
  }).sort({ c_gift: -1 }).catch(() => null)

  const last_live = await LiveLog.findOne({ room_id: data.room_id, is_dev: false }).select({
    'data_id': 1,
    'live_info.date': 1,
    'created_at': 1,
  }).sort({ created_at: -1 }).catch(() => null)

  const longest_live = await LiveLog.findOne({ room_id: data.room_id, is_dev: false }).select({
    'data_id': 1,
    'live_info.duration': 1,
  }).sort({
    'live_info.duration': -1,
  }).catch(() => null)
  return {
    name: data.name,
    stats: {
      missing: {
        showroom: data.member_data?.live_data?.missing?.showroom || 0,
        idn: data.member_data?.live_data?.missing?.idn || 0,
      },
      total_live: {
        showroom: await LiveLog.countDocuments({ room_id: data.room_id, type: 'showroom', is_dev: false }).catch(() => 0),
        idn: await LiveLog.countDocuments({ room_id: data.room_id, type: 'idn', is_dev: false }).catch(() => 0),
      },
      most_gift: most_gift
        ? {
            id: most_gift.data_id,
            gift: most_gift.c_gift,
          }
        : undefined,
      longest_live: longest_live
        ? {
            id: longest_live.data_id,
            duration: longest_live.live_info?.duration,
          }
        : undefined,
      last_live: last_live
        ? {
            id: last_live.data_id,
            date: {
              start: last_live.live_info?.date?.start?.toISOString() || '',
              end: last_live.live_info?.date?.end?.toISOString() || '',
            },
          }
        : undefined,
    },
    nickname: data.member_data?.info?.nicknames?.length ? data.member_data.info?.nicknames[0] : undefined,
    fullname: data.member_data?.name ?? data.name ?? 'No name!',
    img: data.img,
    img_alt: data.member_data?.info?.img ?? data.img_square ?? data.img,
    banner: data.member_data?.info?.banner ?? '',
    description: data.description ?? '',
    group: data.group ?? '',
    jikosokai: data.member_data?.info?.jikosokai ?? '',
    generation: data.generation || '',
    showroom_id: data.room_id,
    showroom_exists: data.room_exists,
    socials: data.member_data?.info?.socials ?? [],
    is_graduate: data.member_data?.info?.is_graduate ?? false,
    bloodType: data.member_data?.info?.blood_type,
    height: data.member_data?.info?.height,
    is_group: data.is_group ?? false,
    url: data.url ?? key,
    birthdate: data.member_data?.info?.birthdate,
    recentTheater,
    upcomingTheater,
  }
}
