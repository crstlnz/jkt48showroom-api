import Showroom from '@schema/showroom/Showroom'
import { createError } from '@/utils/errorResponse'
import Theater from '@/database/showroomDB/jkt48/Theater'
import LiveLog from '@/database/live/schema/LiveLog'

export async function getMemberDetails(key: string): Promise<IMemberProfileAPI> {
  const data = await Showroom.findOne({ url: key })
    .populate({
      path: 'member_data',
      select: 'img isGraduate banner jikosokai socials birthdate name nicknames height bloodType jkt48id',
    })
    .lean()

  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  let recentTheater: ITheaterAPI[] = []
  let upcomingTheater: ITheaterAPI[] = []

  if (data.group === 'jkt48') {
    console.log(data.member_data?.jkt48id)
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

  const longest_live = await LiveLog.findOne({ room_id: data.room_id, is_dev: false }).select({
    'data_id': 1,
    'live_info.duration': 1,
  }).sort({
    'live_info.duration': -1,
  }).catch(() => null)
  return {
    name: data.name,
    stats: {
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
    },
    nickname: data.member_data?.nicknames?.length ? data.member_data.nicknames[0] : undefined,
    fullname: data.member_data?.name ?? data.name ?? 'No name!',
    img: data.img,
    img_alt: data.member_data?.img ?? data.img_square ?? data.img,
    banner: data.member_data?.banner ?? '',
    description: data.description ?? '',
    group: data.group ?? '',
    jikosokai: data.member_data?.jikosokai ?? '',
    generation: data.generation || '',
    room_id: data.room_id,
    showroom_exists: data.room_exists,
    socials: data.member_data?.socials ?? [],
    is_graduate: data.member_data?.isGraduate ?? false,
    bloodType: data.member_data?.bloodType,
    height: data.member_data?.height,
    is_group: data.is_group ?? false,
    url: data.url ?? key,
    birthdate: data.member_data?.birthdate,
    recentTheater,
    upcomingTheater,
  }
}
