import cache from '@utils/cache'
import { getMembers } from './member'
import { calculateRanks } from './calculateRanks'
import { getDateRange } from '@/utils'
import { createError } from '@/utils/errorResponse'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { StageList } from '@/database/showroomDB'
import config from '@/config'

const time = 43200000 // 12 hours

function isIDateRangeType(value: string): value is Stats.IDateRangeType {
  return ['weekly', 'monthly', 'quarterly'].includes(value)
}

function isIDateRangeMemberType(value: string): value is Stats.IDateRangeMemberType {
  return ['weekly', 'monthly', 'all'].includes(value)
}

interface StatsOptions {
  group?: string
  room_id?: number
  type?: string
}

export async function getStats(query: StatsOptions | null = null) {
  const group = config.getGroup(query?.group as string)
  try {
    if (query?.room_id) {
      const type = isIDateRangeMemberType(query.type as string) ? query.type : undefined
      return await getMemberStats(type as Stats.IDateRangeMemberType, query.room_id as number)
    }
    else {
      const type = query?.type && isIDateRangeType(query.type) ? query.type : undefined
      return await getAllMemberStats(type as Stats.IDateRangeType, group)
    }
  }
  catch (e) {
    console.error(e)
    throw e
  }
}

export async function getMemberStats(type: Stats.IDateRangeMemberType = 'all', roomId: number): Promise<Stats.IShowroomMemberStats> {
  const dateRange = type === 'all' ? null : getDateRange(type)
  const cacheString = `${roomId}-${type}`
  const data = await cache.fetch<Stats.IShowroomMemberStats>(cacheString, () => fetchData(type, null, roomId), time)
  if (data?.date?.to === dateRange?.to) return data
  return await fetchData(type, null, roomId)
}

export async function getAllMemberStats(type: Stats.IDateRangeType = 'quarterly', group: string | null = null): Promise<Stats.IShowroomStats> {
  const dateRange = getDateRange(type)
  const cacheString = (group == null) ? type : `${group}-${type}`
  const data = await cache.fetch<Stats.IShowroomStats>(cacheString, () => fetchData(type, group, null), time)
  if (data?.date?.to === dateRange.to) return data
  return await fetchData(type, group, null)
}

export async function fetchData(type: Stats.IDateRangeType, group: string | null, roomId: number | null): Promise<Stats.IShowroomStats>
export async function fetchData(type: Stats.IDateRangeMemberType, group: string | null, roomId: number | null): Promise<Stats.IShowroomMemberStats>
export async function fetchData(type: Stats.IDateRangeType | Stats.IDateRangeMemberType, group: string | null = null, roomId: number | null = null): Promise<Stats.IShowroomStats | Stats.IShowroomMemberStats> {
  const dateRange = (roomId)
    ? null
    : {
        from: getDateRange('quarterly').from,
        to: getDateRange('weekly').to,
      } // get all data and then convert it to monthly and weekly

  let members: IMember[] = []
  if (!roomId) {
    members = await getMembers(group || '')
    if (!members?.length) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch data!',
      })
    }
  }

  const select = {
    room_info: 1,
    total_point: 1,
    created_at: 1,
    users: 1,
    live_info: {
      start_date: 1,
      end_date: 1,
      viewers: {
        peak: 1,
      },
    },
    data_id: 1,
    room_id: 1,
  }

  const option: Stats.StatsOptions = {
    room_id: roomId || members.map(i => i.room_id),

  }

  if (dateRange) {
    option['live_info.end_date'] = {
      $gte: dateRange.from,
      $lte: dateRange.to,
    }
  }

  if (process.env.NODE_ENV !== 'development') option.is_dev = false
  const logs = await ShowroomLog.find(option, select)
    .lean()
    .populate({
      path: 'room_info',
      select: '-_id name img url -room_id member_data',
      populate: {
        path: 'member_data',
        select: '-_id isGraduate img',
      },
    }) as unknown as Database.IShowroomLog[]

  const stageListData = await StageList.find({
    data_id: logs.map(i => i.data_id),
  })

  if (roomId) {
    const weekly = generate(logs, stageListData, 'weekly', 'member')
    const monthly = generate(logs, stageListData, 'monthly', 'member')
    const all = generate(logs, stageListData, 'all', 'member')
    cache.set(`${roomId}-${weekly.type}`, weekly)
    cache.set(`${roomId}-${monthly.type}`, monthly)
    cache.set(`${roomId}-${all.type}`, all)
    if (type === 'all') {
      return all
    }
    else if (type === 'monthly') {
      return monthly
    }
    else {
      return weekly
    }
  }
  else {
    const weekly = generate(logs, stageListData, 'weekly', 'all')
    const monthly = generate(logs, stageListData, 'monthly', 'all')
    const quarterly = generate(logs, stageListData, 'quarterly', 'all')
    cache.set(group ? `${group}-${weekly.type}` : weekly.type, weekly)
    cache.set(group ? `${group}-${monthly.type}` : monthly.type, monthly)
    cache.set(group ? `${group}-${quarterly.type}` : quarterly.type, quarterly)
    if (type === 'quarterly') {
      return quarterly
    }
    else if (type === 'monthly') {
      return monthly
    }
    else {
      return weekly
    }
  }
}

function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeType, typeStats: 'member' | 'all'): Stats.IShowroomStats | Stats.IShowroomMemberStats
function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeMemberType, typeStats: 'member' | 'all'): Stats.IShowroomMemberStats
function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeType | Stats.IDateRangeMemberType, typeStats: 'member' | 'all'): Stats.IShowroomStats | Stats.IShowroomMemberStats {
  const dateRange = type === 'all' ? null : getDateRange(type)
  let log = logs
  if (dateRange) {
    log = logs.filter(i => new Date(i.live_info.start_date).getTime() >= new Date(dateRange.from).getTime() && new Date(i.live_info.start_date).getTime() <= new Date(dateRange.to).getTime())
  }

  const filteredStageList = log.length > 0 ? stageListData.filter(i => log.some(z => z.data_id === i.data_id)) : []

  const all = calculateRanks(log, filteredStageList)
  const memberList = all.member.map((i) => {
    return {
      ...i,
      live_point: i.total_viewer / i.live_count + i.point / 100,
      avg_viewer: Math.floor(i.total_viewer / i.live_count),
    }
  })
  const statsLive: Stats.IStats[] = [
    {
      title: 'Live Count',
      key: 'livecount',
      value: all.member.reduce((a, b) => a + b?.live_count ?? 0, 0),
    },
  ]
  if (memberList.length) {
    if (typeStats === 'all') {
      const mostViews = memberList.sort((a, b) => b.most_viewer - a.most_viewer)[0]
      const mostLive = memberList.sort((a, b) => b.live_count - a.live_count)[0]
      const topMember = memberList.sort((a, b) => b.live_point - a.live_point)[0]
      statsLive.push(
        ...[
          {
            title: 'Most Live',
            key: 'mostlive',
            img: {
              title: mostLive.name,
              src: mostLive.img,
            },
            value: `${mostLive.live_count} ${mostLive.live_count > 1 ? 'Lives' : 'Live'}`,
          },
          {
            title: 'Top Member',
            key: 'topmember',
            img: {
              title: topMember.name,
              src: topMember.img,
            },
            value: topMember.name,
          },
        ],
      )

      statsLive.push({
        title: 'Most Viewer',
        key: 'mostviewer',
        img: {
          title: mostViews.name,
          src: mostViews.img,
        },
        value: mostViews.most_viewer,
        parseType: 'viewer',
      })
    }
    else {
      statsLive.push({
        title: 'Most Gifts',
        key: 'mostgifts',
        value: memberList[0].most_point,
        parseType: 'gift',
      })

      statsLive.push({
        title: 'Most Viewer',
        key: 'mostviewer',
        value:
            memberList[0].most_viewer > 1000
              ? `${(memberList[0].most_viewer / 1000).toFixed(2)}K Viewers`
              : `${memberList[0].most_viewer} ${memberList[0].most_viewer > 1 ? 'Viewers' : 'Viewer'}`,
      })
      statsLive.push({
        title: 'Longest Live',
        key: 'longestlive',
        value: memberList[0].duration,
        parseType: 'duration',
      })
    }
  }

  return {
    type,
    ranks: all,
    stats: statsLive,
    date: !dateRange
      ? {
          from: '',
          to: getDateRange('weekly').to,
        }
      : {
          from: dateRange?.from ?? '',
          to: dateRange?.to ?? '',
        }
    ,
  }
}
