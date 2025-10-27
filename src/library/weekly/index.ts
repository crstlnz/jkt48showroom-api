import type { Context } from 'hono'
import { ApiError } from '@/utils/errorResponse'
import weeklyDuration from './type/duration'
import weeklyFollower from './type/follower'
import weeklyGifts from './type/gifts'
import weeklyNolive from './type/nolive'
import totalTheater from './type/theater'
import totalLive from './type/totalLive'
import weeklyViewers from './type/viewers'

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
    value: string | number
  }[]
}

export type FormatType = 'raw' | 'normal' | 'extended'
const formats: FormatType[] = ['raw', 'normal', 'extended']

export default async function getWeekly(ctx: Context): Promise<WeeklyData> {
  const apiKey = ctx.req.query('api_key')
  if (apiKey !== process.env.API_KEY) throw new ApiError({ status: 401, message: 'Unauthorized!' })

  let format: FormatType = ctx.req.query('format') as FormatType
  if (!formats.includes(format as FormatType) || !format) {
    format = 'normal'
  }

  const queryPlatform = ctx.req.query('platform')
  const queryType = ctx.req.query('type')
  const platform: LivePlatform = queryPlatform !== 'showroom' && queryPlatform !== 'idn' ? 'all' : queryPlatform
  const type: WeeklyType = weeklyType.includes(queryType ?? '' as any) ? queryType! : 'live' as any

  function get() {
    if (type === 'live') {
      return totalLive(platform, format)
    }
    else if (type === 'gift') {
      return weeklyGifts(platform, format)
    }
    else if (type === 'theater') {
      return totalTheater(format)
    }
    else if (type === 'duration') {
      return weeklyDuration(platform, format)
    }
    else if (type === 'viewers') {
      return weeklyViewers(platform, format)
    }
    else if (type === 'nolive') {
      return weeklyNolive(format)
    }
    else if (type === 'follower') {
      return weeklyFollower(platform, format)
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
