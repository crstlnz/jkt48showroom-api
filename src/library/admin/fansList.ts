import type { Context } from 'hono'
import ShowroomUser from '@/database/schema/showroom/ShowroomUser'
import Config from '@/database/schema/config/Config'

export default async function getFansList(c: Context): Promise<{ jpy_rates: number, fans: Database.IShowroomFans[] }> {
  let page = 1
  const query = c.req.query()
  const maxPerpage = 30
  if (query.page) page = Number(query.page) ?? 1
  if (page < 1) page = 1
  const perpage = Math.min(Number.parseInt(query.perpage as string) || 10, maxPerpage)
  const fans = await ShowroomUser.find({}).sort({ point: -1 }).skip((page - 1) * perpage).limit(10).lean()
  const data = (await Config.findOne({ configname: 'japan_rate' }).lean())?.value ?? 106.74
  return {
    jpy_rates: Number(data),
    fans: fans.map<Database.IShowroomFans>((fans: any) => {
      return {
        avatar_url: fans.avatar_url,
        point: fans.point,
        user_id: fans.user_id,
        name: fans.name,
        last_seen: fans.last_seen,
        image: fans.image,
        avatar_id: fans.avatar_id,
      }
    }),
  }
}
