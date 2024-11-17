import type { Context } from 'hono'
import totalLive from './type/totalLive'
import totalTheater from './type/theater'
import weeklyDuration from './type/duration'
import weeklyViewers from './type/viewers'
import weeklyNolive from './type/nolive'
import { ApiError } from '@/utils/errorResponse'

export type WeeklyType = 'theater' | 'gift' | 'live' | 'duration' | 'viewers' | 'nolive' | 'follower'
const weeklyType: WeeklyType[] = ['theater', 'gift', 'live', 'duration', 'viewers', 'nolive', 'follower']
export type LivePlatform = 'idn' | 'showroom' | 'all'
export interface WeeklyData {
  title: string
  subtitle: string
  platform?: LivePlatform
  type: WeeklyType
  date: string
  data:
  {
    member: string
    pic: string
    value: string
  }[]
}

export default async function getWeekly(ctx: Context): Promise<WeeklyData> {
  const apiKey = ctx.req.query('api_key')
  if (apiKey !== process.env.API_KEY) throw new ApiError({ status: 401, message: 'Unauthorized!' })
  const queryPlatform = ctx.req.query('platform')
  const queryType = ctx.req.query('type')
  const platform: LivePlatform = queryPlatform !== 'showroom' && queryPlatform !== 'idn' ? 'all' : queryPlatform
  const type: WeeklyType = weeklyType.includes(queryType ?? '' as any) ? queryType! : 'live' as any

  function get() {
    if (type === 'live') {
      return totalLive(platform)
    }
    else if (type === 'gift') {
      return totalLive(platform)
    }
    else if (type === 'theater') {
      return totalTheater()
    }
    else if (type === 'duration') {
      return weeklyDuration(platform)
    }
    else if (type === 'viewers') {
      return weeklyViewers(platform)
    }
    else if (type === 'nolive') {
      return weeklyNolive()
    }

    throw new ApiError({ message: 'not implemented yet', status: 500 })
  }

  const res = await get()
  return {
    ...res,
    type,
    data: res.data,
  }
}
