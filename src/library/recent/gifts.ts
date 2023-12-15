import Fuse from 'fuse.js'
import ShowroomLog from '@schema/showroom/ShowroomLog'
import type { Context } from 'hono'
import config from '@/config'

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

export async function getGifts(c: Context): Promise<IApiGifts> {
  let page = Number(c.req.query('page') || 1)
  const data_id = c.req.param('data_id') || ''
  const search = c.req.query('s') || ''
  const perpage = Number(c.req.query('perpage') || config.giftPerpage)
  const data = await ShowroomLog.findOne({ data_id }).select({ gift_data: 1, users: 1 }).lean()
  let total_count = data?.gift_data?.gift_log?.length ?? 0
  const raw = data?.gift_data?.gift_log ?? []
  let giftLogs = []
  if (search !== '') {
    const fuse = new Fuse(data?.users ?? [], {
      keys: ['name'],
      threshold: 0.45,
    })
    const searched = fuse.search(search)
    const giftLogsSearch = searched.map((i) => {
      const giftData = raw.find(g => g.user_id === i.item.user_id)
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
  const users = []
  for (const usr of giftLogs) {
    const u = data?.users.find(i => i.user_id === usr.user_id)
    if (u) {
      users.push({
        id: u.user_id,
        name: u.name,
        avatar_id: u.avatar_id,
      })
    }
  }

  if (page < 1) page = 1
  return {
    gifts: giftLogs.map((i) => {
      return {
        ...i,
        gifts: i.gifts.map((g) => {
          return {
            id: g.gift_id,
            date: g.date,
            num: g.num,
          }
        }),
      }
    }),
    users,
    perpage,
    search,
    page,
    total_count,
  }
}
