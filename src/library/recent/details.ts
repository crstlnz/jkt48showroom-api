import ShowroomLog from '@schema/showroom/ShowroomLog'
import ShowroomGift from '@schema/showroom/ShowroomGift'
import type { Context } from 'hono'
import { calculateFansPoints } from '../fansPoints'
import { createError } from '@/utils/errorResponse'
import config from '@/config'

export async function getRecentDetails(c: Context): Promise<IRecentDetail> {
  const id = c.req.param('id')
  const data = await ShowroomLog.getDetails(id)
  const giftPerpage = config.giftPerpage
  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  const fansRank = calculateFansPoints([...data.users.values()], data.live_info?.stage_list ?? [])
  const giftData = await ShowroomGift.find({ gift_id: data.live_info.gift.list.map(i => i.id) }).lean()
  const giftMap = new Map<number, Database.GiftData >()
  for (const gift of giftData) {
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

  for (const giftLog of data.live_info.gift.log ?? []) {
    for (const gift of giftLog.gifts) {
      const g = giftMap.get(gift.id)
      if (g) {
        g.num += gift.num
        g.user_count += 1
      }
    }
  }

  for (const freeGift of data.live_info.gift.free ?? []) {
    const g = giftMap.get(freeGift.gift_id)
    if (g) {
      g.num += freeGift.num
      g.user_count += freeGift.users
    }
  }

  const gifts = (data.live_info?.gift?.list ?? []).map<Database.GiftData>((g) => {
    const gift = giftMap.get(g.id)
    if (gift) {
      return {
        ...gift,
      }
    }
    else {
      return {
        name: '',
        point: 0,
        id: g.id,
        user_count: 0,
        free: false,
        img: config.giftUrl(g.id),
        is_delete_from_stage: true,
        num: 0,
      }
    }
  })

  const userMap = new Map<number, Database.IFansCompact>()
  const stageList = (data.live_info.stage_list ?? []).pop()
  if (stageList) {
    for (const userId of stageList.list) {
      const u = data.users.get(userId)
      if (u) {
        userMap.set(userId, u)
      }
    }
  }

  for (const giftData of data.live_info?.gift?.log?.slice(0, giftPerpage) ?? []) {
    const u = data.users.get(giftData.user_id)
    if (u) {
      userMap.set(u.id, u)
    }
  }

  return {
    ...data,
    live_id: Number(data.live_id) || 0,
    users: [...userMap.values()],
    fans: fansRank,
    live_info: {
      duration: data.live_info.duration,
      comments: data.live_info.comments,
      viewers: data.live_info.viewers,
      screenshot: data.live_info.screenshot,
      background_image: data.live_info.background_image,
      stage_list: stageList ? [stageList] : [],
      date: data.live_info.date,
      gift: {
        log: data.live_info.gift.log.slice(0, giftPerpage),
        next_page: giftPerpage < data.live_info.gift?.log?.length,
        list: gifts.sort((a, b) => {
          if (a.point === b.point) {
            return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)
          }
          else {
            return b.point - a.point
          }
        }),
      },
    },
  }
}
