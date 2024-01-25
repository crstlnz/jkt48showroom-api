import ShowroomGift from '@schema/showroom/ShowroomGift'
import type { Context } from 'hono'
import { calculateFansPoints } from '../fansPoints'
import { createError } from '@/utils/errorResponse'
import config from '@/config'
import LiveLog from '@/database/live/schema/LiveLog'
import { StageList } from '@/database/showroomDB/StageList'
import { IDNGift } from '@/database/live/schema/idn/Gift'

export async function parseBase(data: Log.Live): Promise<LogDetail.Base> {
  return {
    data_id: data.data_id,
    live_id: data.live_id,
    room_id: data.room_id,
    room_info: {
      name: data.room_info?.name ?? 'Member not found!',
      nickname: (data as any).custom?.title ?? (data as any).custom?.theater?.title ?? data.room_info?.member_data?.nicknames?.[0],
      fullname: data.room_info?.member_data?.name,
      img: (data as any).custom?.img ?? data.room_info?.img ?? config.errorPicture,
      img_alt: (data as any).custom?.img ?? data.room_info?.member_data?.img ?? data.room_info?.img_square,
      url: data.room_info?.url ?? '',
      is_graduate: data.room_info?.member_data?.isGraduate ?? data.room_info?.is_group ?? false,
      is_group: data.room_info?.is_group ?? false,
      banner: data.room_info?.member_data?.banner ?? '',
      jikosokai: data.room_info?.member_data?.jikosokai ?? '',
      generation: data.room_info?.generation ?? '',
      group: data.room_info?.group ?? '',
    },
    total_gifts: data.total_gifts,
    gift_rate: data.gift_rate,
    created_at: data.created_at.toISOString(),
  }
}

export function getGiftPagination(data: Log.Live): { users: Log.ShowroomMiniUser[] | Log.IDNMiniUser[], gifts: Log.UserGifts[], next_page: boolean } {
  const giftLog = data.gift_data.gift_log.slice(0, config.giftPerpage)
  const userIds = giftLog.map(i => String(i.user_id))
  const users = data.users?.filter(i => userIds.includes(String(i.user_id))) || []
  return {
    users: users as Log.ShowroomMiniUser[] | Log.IDNMiniUser[],
    gifts: giftLog,
    next_page: config.giftPerpage < data.gift_data.gift_log.length,
  }
}

export async function parseShowroom(data: Log.Showroom): Promise<LogDetail.Showroom> {
  const giftPagination = getGiftPagination(data)
  const users: LogDetail.ShowroomUser[] = giftPagination.users.map((i) => {
    return {
      id: i.user_id as number,
      name: i.name,
      avatar_id: (i as Log.ShowroomMiniUser).avatar_id || 1,
      comments: i.comments,
    }
  })
  const stageListData = await StageList.findOne({ data_id: data.data_id }).lean()
  const fansRank = calculateFansPoints(data.users, stageListData?.stage_list ?? [])
  const giftList = await ShowroomGift.find({ gift_id: data.gift_data.gift_id_list }).lean()

  const giftMap = new Map<number, LogDetail.ShowroomGift >()

  const userMap = new Map<number, LogDetail.ShowroomUser>()
  const stageList = (stageListData?.stage_list ?? []).pop()
  if (stageList) {
    for (const userId of stageList.list) {
      const u = data.users.find(i => i.user_id === userId)
      if (u) {
        userMap.set(userId, {
          id: u.user_id,
          comments: u.comments,
          name: u.name,
          avatar_id: u.avatar_id || 1,
        })
      }
    }
  }

  for (const user of users) {
    userMap.set(user.id, { ...user })
  }

  for (const gift of giftList) {
    giftMap.set(gift.gift_id, {
      name: gift.gift_name,
      point: gift.point,
      id: gift.gift_id,
      free: gift.free,
      img: gift.image,
      is_delete_from_stage: gift.is_delete_from_stage,
      user_count: 0,
      num: 0,
    })
  }

  for (const giftLog of data.gift_data.gift_log ?? []) {
    for (const gift of giftLog.gifts) {
      const g = giftMap.get(gift.gift_id)
      if (g) {
        g.num += gift.num
        g.user_count += 1
      }
    }
  }

  // TODO find better method
  /// fix user count
  for (const gift of giftMap.values()) {
    gift.user_count = data.gift_data.gift_log.filter(i => i.gifts.some(g => String(g.gift_id) === String(gift.id))).length
  }

  for (const freeGift of data.gift_data.free_gifts ?? []) {
    const g = giftMap.get(freeGift.gift_id)
    if (g) {
      g.num += freeGift.num
      g.user_count += freeGift.users
    }
  }

  const gifts = (giftList ?? []).map<LogDetail.ShowroomGift>((g) => {
    const gift = giftMap.get(g.gift_id)
    if (gift) {
      return {
        ...gift,
      }
    }
    else {
      return {
        name: g.gift_name,
        point: 0,
        id: g.gift_id,
        user_count: 0,
        free: false,
        img: config.giftUrl(g.gift_id),
        is_delete_from_stage: true,
        num: 0,
      }
    }
  })

  return {
    ...await parseBase(data),
    fans: fansRank,
    users: [...userMap.values()],
    live_info: {
      stage_list: stageList ? [stageList] : [],
      gift: {
        log: (giftPagination.gifts as Log.ShowroomUserGifts[]).map((i) => {
          return {
            gifts: i.gifts.map((g) => {
              return {
                id: g.gift_id,
                num: g.num,
                date: g.date.toISOString(),
              }
            }),
            total: i.total,
            user_id: i.user_id,
          }
        }),
        next_page: giftPagination.next_page,
        list: gifts.sort((a, b) => {
          if (a.point === b.point) {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
          }
          else {
            return b.point - a.point
          }
        }),
      },
      viewers: {
        num: data.live_info.viewers.peak,
        active: data.live_info.viewers.active,
        is_excitement: data.live_info.viewers.is_excitement,
      },
      comments: data.live_info.comments,
      background_image: data.live_info.background_image,
      // TODO temporary disabled
      // screenshot: data.live_info.screenshots,
      duration: data.live_info.duration,
      date: {
        start: data.live_info.date.start.toISOString(),
        end: data.live_info.date.end.toISOString(),
      },
    },
    type: 'showroom',
  }
}

export async function parseIDN(data: Log.IDN): Promise<LogDetail.IDN> {
  const giftPagination = getGiftPagination(data)
  const giftList = await IDNGift.find({ slug: data.gift_data.gift_id_list }).lean()
  const giftMap = new Map<string, LogDetail.IDNGift >()

  const users: LogDetail.IDNUser[] = giftPagination.users.map((i) => {
    return {
      id: i.user_id as number,
      name: i.name,
      avatar_url: (i as Log.IDNMiniUser).avatar_url || '',
      comments: i.comments,
    }
  })

  for (const gift of giftList) {
    giftMap.set(gift.slug, {
      name: gift.name,
      point: gift.gold,
      id: gift.slug,
      free: false,
      img: gift.image_url || '',
      user_count: 0,
      num: 0,
    })
  }

  for (const giftLog of data.gift_data.gift_log ?? []) {
    for (const gift of giftLog.gifts) {
      const g = giftMap.get(String(gift.gift_id))
      if (g) {
        g.num += 1
        g.user_count += 1
      }
    }
  }

  /// fix user count
  for (const gift of giftMap.values()) {
    gift.user_count = data.gift_data.gift_log.filter(i => i.gifts.some(g => String(g.gift_id) === String(gift.id))).length
  }

  const gifts = (giftList ?? []).map<LogDetail.IDNGift>((g) => {
    const gift = giftMap.get(g.slug)
    if (gift) {
      return {
        ...gift,
      }
    }
    else {
      return {
        name: g.name,
        point: 0,
        id: g.slug,
        user_count: 0,
        free: false,
        img: g.image_url || '',
        num: 0,
      }
    }
  })

  return {
    ...await parseBase(data),
    idn: data.idn,
    live_info: {
      duration: data.live_info.duration,
      gift: {
        log: (giftPagination.gifts as Log.ShowroomUserGifts[]).map((i) => {
          return {
            gifts: i.gifts.map((g) => {
              return {
                id: g.gift_id,
                num: g.num || 1,
                date: g.date.toISOString(),
              }
            }),
            total: i.total,
            user_id: i.user_id,
          }
        }),
        next_page: giftPagination.next_page,
        list: gifts.sort((a, b) => {
          if (a.point === b.point) {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
          }
          else {
            return b.point - a.point
          }
        }),
      },
      viewers: {
        num: data.live_info.viewers.peak,
        active: data.live_info.viewers.active,
        is_excitement: false,
      },
      comments: data.live_info.comments,
      // TODO temporary disabled
      // screenshot: data.live_info.screenshots
      date: {
        start: data.live_info.date.start.toISOString(),
        end: data.live_info.date.end.toISOString(),
      },
    },
    users,
    type: 'idn',
  }
}

export async function getRecentDetails(c: Context): Promise<LogDetail.Showroom | LogDetail.IDN> {
  const id = c.req.param('id')
  const data = await LiveLog.findOne({ data_id: id }).populate({
    path: 'room_info',
    options: {
      select: '-_id name img url -room_id member_data is_group generation group img_square',
      populate: {
        path: 'member_data',
        select: 'img isGraduate banner jikosokai name nicknames',
      },
    },
  }).lean()
  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  if (data.type === 'showroom') {
    return parseShowroom(data as Log.Showroom)
  }
  else {
    return parseIDN(data as Log.IDN)
  }
}

// export async function getRecentDetails(c: Context): Promise<IRecentDetail> {
//   const id = c.req.param('id')
//   const data = await LiveLog.getDetails(id)
//   const giftPerpage = config.giftPerpage
//   if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
//   const fansRank = calculateFansPoints([...data.users.values()], data.live_info?.stage_list ?? [])
//   const giftData = await ShowroomGift.find({ gift_id: data.live_info.gift.list.map(i => i.id) }).lean()
//   const giftMap = new Map<number, Database.GiftData >()
//   for (const gift of giftData) {
//     giftMap.set(gift.gift_id, {
//       name: gift.gift_name,
//       point: gift.point,
//       id: gift.gift_id,
//       free: gift.free,
//       img: gift.image,
//       is_delete_from_stage: gift.is_delete_from_stage,
//       user_count: 0,
//       num: 0,
//     })
//   }

//   for (const giftLog of data.live_info.gift.log ?? []) {
//     for (const gift of giftLog.gifts) {
//       const g = giftMap.get(gift.id)
//       if (g) {
//         g.num += gift.num
//         g.user_count += 1
//       }
//     }
//   }

//   for (const freeGift of data.live_info.gift.free ?? []) {
//     const g = giftMap.get(freeGift.gift_id)
//     if (g) {
//       g.num += freeGift.num
//       g.user_count += freeGift.users
//     }
//   }

//   const gifts = (data.live_info?.gift?.list ?? []).map<Database.GiftData>((g) => {
//     const gift = giftMap.get(g.id)
//     if (gift) {
//       return {
//         ...gift,
//       }
//     }
//     else {
//       return {
//         name: '',
//         point: 0,
//         id: g.id,
//         user_count: 0,
//         free: false,
//         img: config.giftUrl(g.id),
//         is_delete_from_stage: true,
//         num: 0,
//       }
//     }
//   })

//   const userMap = new Map<number, Database.IFansCompact>()
//   const stageList = (data.live_info.stage_list ?? []).pop()
//   if (stageList) {
//     for (const userId of stageList.list) {
//       const u = data.users.get(userId)
//       if (u) {
//         userMap.set(userId, u)
//       }
//     }
//   }

//   for (const giftData of data.live_info?.gift?.log?.slice(0, giftPerpage) ?? []) {
//     const u = data.users.get(giftData.user_id)
//     if (u) {
//       userMap.set(u.id, u)
//     }
//   }

//   return {
//     ...data,
//     live_id: Number(data.live_id) || 0,
//     users: [...userMap.values()],
//     fans: fansRank,
//     live_info: {
//       duration: data.live_info.duration,
//       comments: data.live_info.comments,
//       viewers: data.live_info.viewers,
//       screenshot: data.live_info.screenshot,
//       background_image: data.live_info.background_image,
//       stage_list: stageList ? [stageList] : [],
//       date: data.live_info.date,
//       gift: {
//         log: data.live_info.gift.log.slice(0, giftPerpage),
//         next_page: giftPerpage < data.live_info.gift?.log?.length,
//         list: gifts.sort((a, b) => {
//           if (a.point === b.point) {
//             return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
//           }
//           else {
//             return b.point - a.point
//           }
//         }),
//       },
//     },
//   }
// }
