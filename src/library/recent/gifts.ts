import Fuse from 'fuse.js'
import type { Context } from 'hono'
import config from '@/config'
import LiveLog from '@/database/live/schema/LiveLog'
import { createError } from '@/utils/errorResponse'
import UserLog from '@/database/userDB/UserLog'

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

export async function getGifts(c: Context): Promise<IApiShowroomGift | IApiIDNGift> {
  const data_id = c.req.param('data_id') || ''

  const data = await LiveLog.findOne({ data_id }).select({ gift_data: 1, type: 1, users: -1 }).lean()
  if (!data) throw createError({ status: 404, message: 'Gifts not found!' })
  const userData = await UserLog.findOne({ data_id }).select({ users: 1 }).lean()
  data.users = userData?.users ?? []
  if (data.type === 'showroom') {
    return parseGift(c, data as Log.Showroom)
  }
  else {
    return parseGift(c, data as Log.IDN)
  }
}

function getUserShowroom(data: Log.Showroom, gifts: Log.UserGifts[]) {
  const users = []
  for (const usr of gifts) {
    const u = data?.users?.find(i => i.user_id === usr.user_id)
    if (u) {
      users.push({
        id: u.user_id,
        name: u.name,
        avatar_id: u.avatar_id || 1,
        comments: u.comments,
      })
    }
  }
  return users
}

function getUserIDN(data: Log.IDN, gifts: Log.UserGifts[]) {
  const users = []
  for (const usr of gifts) {
    const u = data?.users?.find(i => i.user_id === usr.user_id)
    if (u) {
      users.push({
        id: u.user_id,
        name: u.name,
        avatar_url: u.avatar_url || '',
        comments: u.comments,
      })
    }
  }
  return users
}

function parseGift(c: Context, data: Log.IDN): IApiIDNGift
function parseGift(c: Context, data: Log.Showroom): IApiShowroomGift
function parseGift(c: Context, data: Log.Showroom | Log.IDN): IApiShowroomGift | IApiIDNGift {
  let page = Number(c.req.query('page') || 1)
  const search = c.req.query('s') || ''
  const perpage = Number(c.req.query('perpage') || config.giftPerpage)
  let total_count = data?.gift_data?.gift_log?.length ?? 0
  const raw = data?.gift_data?.gift_log ?? []
  const usersData = (data?.users ?? []).map((i) => {
    return {
      user_id: String(i.user_id),
      name: i.name,
      comments: i.comments,
      avatar_id: i.avatar_id, // showroom props
      avatar_url: i.avatar_url, // idn
    }
  })
  let giftLogs = []
  if (search !== '') {
    const fuse = new Fuse(usersData, {
      keys: ['name'],
      threshold: 0.45,
    })
    const searched = fuse.search(search)
    const giftLogsSearch = searched.map((i) => {
      const giftData = raw.find(g => String(g.user_id) === String(i.item.user_id))
      if (!giftData) return null
      return {
        ...giftData,
      }
    }).filter(notEmpty)
    total_count = giftLogsSearch.length
    giftLogs.push(...giftLogsSearch.slice(perpage * (page - 1), perpage * page))
  }
  else {
    giftLogs = raw.slice(perpage * (page - 1), perpage * page)
  }
  let users: any[]
  if (data.type === 'showroom') {
    users = getUserShowroom(data, giftLogs)
  }
  else {
    users = getUserIDN(data, giftLogs)
  }

  if (page < 1) page = 1
  return {
    gifts: giftLogs.map((i) => {
      return {
        ...i,
        gifts: i.gifts.map((g) => {
          return {
            id: g.gift_id,
            date: g.date.toISOString(),
            num: g.num,
          }
        }),
      }
    }) as any,
    users,
    perpage,
    search,
    page,
    total_count,
  }
}
