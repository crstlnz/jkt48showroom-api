import type { Context } from 'hono'
import dayjs from 'dayjs'
import config from '@/config'
import LiveLog from '@/database/live/schema/LiveLog'
import StatsModel from '@/database/live/schema/Stats'
import UserLog from '@/database/userDB/UserLog'
import { getMembers } from '@/library/member'
import cache from '@/utils/cache'
import { createError } from '@/utils/errorResponse'
import singleflight from '@/utils/singleflight'

const STATS_TYPE = 'monthly'
const TIMEZONE = 'Asia/Jakarta'
const SNAPSHOT_VERSION = 5
const SNAPSHOT_CACHE_TTL_MS = 1000 * 60 * 10 // 10 minutes
const MONTH_LIST_CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour
const DEFAULT_TOP_FANS_LIMIT = 50
const MAX_TOP_FANS_LIMIT = 100
const PREBUILD_TOP_FANS_LIMIT = 300
const LEADERBOARD_LIMIT = 10
const DEFAULT_GROUP = 'jkt48'
const SUPPORTED_GROUPS = ['jkt48', 'hinatazaka46'] as const

type SupportedGroup = (typeof SUPPORTED_GROUPS)[number]

interface MemberAggregate {
  _id: number
  total_lives: number
  total_showroom_lives: number
  total_idn_lives: number
  total_gift: number
  total_comments: number
  total_duration: number
  avg_duration: number
  avg_viewer: number
  max_viewer: number
  longest_duration: number
  last_live_at: Date | null
  last_data_id: string | null
  active_days: number
}

interface TopGifterAggregate {
  user_id: string | number
  name?: string
  avatar_id?: number
  avatar_url?: string
  total_gift: number
  total_lives_supported: number
  last_supported_at: Date | null
  latest_data_id?: string
}

interface HighlightLive {
  data_id: string
  room_id: number
  type: Log.Type
  ended_at: Date | null
  duration: number
  gift: number
  viewers: number
  comments: number
}

interface TimelineRow {
  _id: string
  live_count: number
  showroom_lives: number
  idn_lives: number
  total_gift: number
  total_duration: number
  avg_viewer: number
  total_comments: number
}

interface WeekdayRow {
  _id: number
  live_count: number
  total_gift: number
  avg_viewer: number
}

interface PrimeHourRow {
  _id: number
  live_count: number
  total_gift: number
}

interface UniqueGifterCount {
  total: number
}

interface InsightFacet {
  peak_viewer: HighlightLive[]
  longest_live: HighlightLive[]
  biggest_gift: HighlightLive[]
  most_comments: HighlightLive[]
  timeline: TimelineRow[]
  weekday: WeekdayRow[]
  prime_hours: PrimeHourRow[]
  unique_gifters: UniqueGifterCount[]
}

interface SnapshotDoc {
  key: string
  type: string
  group: SupportedGroup
  month: string
  date: {
    from: Date
    to: Date
  }
  generated_at: Date
  version: number
  payload: any
}

interface UserLogLookupDoc {
  data_id: string
  users?: Array<{
    user_id: string | number
    name?: string
    avatar_id?: number
    avatar_url?: string
  }>
}

function getSnapshotKey(group: SupportedGroup, month: string) {
  return `${STATS_TYPE}:${group}:${month}`
}

function parseMonth(value?: string | null): dayjs.Dayjs {
  if (!value || value === 'last') return dayjs().subtract(1, 'month').startOf('month')
  if (value === 'current') return dayjs().startOf('month')
  const parsed = dayjs(value).startOf('month')
  if (!parsed.isValid()) {
    throw createError({
      status: 400,
      message: 'Invalid month parameter. Use YYYY-MM or ISO date.',
    })
  }
  return parsed
}

function parseTopFansLimit(value?: string | null): number {
  if (!value) return DEFAULT_TOP_FANS_LIMIT
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TOP_FANS_LIMIT
  return Math.min(parsed, MAX_TOP_FANS_LIMIT)
}

function parsePositiveInteger(value: string | null | undefined, fallback: number, maxValue: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, maxValue)
}

function parseGroup(value?: string | null): SupportedGroup {
  const group = config.getGroup(value || DEFAULT_GROUP)
  if (!group) {
    throw createError({
      status: 400,
      message: 'Invalid group parameter.',
    })
  }
  return group as SupportedGroup
}

function isUnknownUserName(value?: string | null) {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'unknown'
}

function getMemberBase(member: IMember | undefined, fallbackRoomId: number, group: SupportedGroup) {
  const nickname = member?.nicknames?.[0] || member?.name || `Room ${fallbackRoomId}`
  return {
    name: member?.name || nickname,
    nickname,
    img: member?.img || '',
    img_alt: member?.img_alt || member?.img || '',
    url: member?.url || '',
    is_graduate: member?.is_graduate ?? false,
    group: member?.group || group,
  }
}

function getWeekdayName(day: number) {
  switch (day) {
    case 1:
      return 'Sunday'
    case 2:
      return 'Monday'
    case 3:
      return 'Tuesday'
    case 4:
      return 'Wednesday'
    case 5:
      return 'Thursday'
    case 6:
      return 'Friday'
    case 7:
      return 'Saturday'
    default:
      return 'Unknown'
  }
}

function mapTopMember<T>(
  data: T[],
  getter: (item: T) => number,
  key: string,
  title: string,
  limit = LEADERBOARD_LIMIT,
) {
  return [...data]
    .sort((a, b) => getter(b) - getter(a))
    .slice(0, limit)
    .map((item: any) => ({
      key,
      title,
      value: getter(item),
      room_id: item.room_id,
      member: item.member,
      stats: item.stats,
    }))
}

function mapHighlight(
  key: string,
  title: string,
  data: HighlightLive | undefined,
  memberMap: Map<number, IMember>,
  group: SupportedGroup,
) {
  if (!data) return null
  const member = getMemberBase(memberMap.get(data.room_id), data.room_id, group)
  return {
    key,
    title,
    value: {
      viewers: data.viewers,
      duration: data.duration,
      gift: data.gift,
      comments: data.comments,
    },
    live: {
      data_id: data.data_id,
      room_id: data.room_id,
      type: data.type,
      ended_at: data.ended_at,
    },
    member,
  }
}

async function getStoredSnapshot(group: SupportedGroup, month: string): Promise<SnapshotDoc | null> {
  return await StatsModel.findOne({
    type: STATS_TYPE,
    group,
    month,
    version: SNAPSHOT_VERSION,
  }).lean() as SnapshotDoc | null
}

async function buildMonthlyPayload(group: SupportedGroup, monthDate: dayjs.Dayjs) {
  const month = monthDate.startOf('month')
  const from = month.toDate()
  const to = month.endOf('month').toDate()
  const monthKey = month.format('YYYY-MM')
  const members = await getMembers(group)
  const roomIds = members
    .map(i => i.room_id)
    .filter((i): i is number => Number.isFinite(i))

  const baseMeta = {
    id: getSnapshotKey(group, monthKey),
    type: STATS_TYPE,
    group,
    month: monthKey,
    from,
    to,
    timezone: TIMEZONE,
    source: 'prebuilt',
    gift_unit: 'idr',
    room_count: roomIds.length,
  }

  if (!roomIds.length) {
    return {
      meta: {
        ...baseMeta,
        live_count: 0,
      },
      summary: {
        total_members: 0,
        total_lives: 0,
        total_showroom_lives: 0,
        total_idn_lives: 0,
        platform_share: {
          showroom_pct: 0,
          idn_pct: 0,
        },
        total_gift: 0,
        avg_gift_per_live: 0,
        avg_duration: 0,
        avg_viewer: 0,
        total_comments: 0,
        unique_gifters: 0,
        active_days: 0,
        highest_daily_live_count: 0,
      },
      members: [],
      top_gifters: [],
      content: {
        leaderboards: {
          by_total_gift: [],
          by_live_count: [],
          by_avg_viewer: [],
          by_max_viewer: [],
          by_engagement: [],
          by_active_days: [],
        },
        highlights: [],
        weekday_breakdown: [],
        prime_hours: [],
      },
      timeline: [],
    }
  }

  const match: Record<string, unknown> = {
    'room_id': { $in: roomIds },
    'live_info.date.end': {
      $gte: from,
      $lte: to,
    },
  }

  if (process.env.NODE_ENV !== 'development') {
    match.is_dev = false
  }

  const [memberAgg, topGifterAgg, insightAggRaw] = await Promise.all([
    LiveLog.aggregate<MemberAggregate>([
      {
        $match: match,
      },
      {
        $sort: {
          'room_id': 1,
          'live_info.date.end': -1,
        },
      },
      {
        $group: {
          _id: '$room_id',
          total_lives: { $sum: 1 },
          total_showroom_lives: {
            $sum: {
              $cond: [{ $eq: ['$type', 'showroom'] }, 1, 0],
            },
          },
          total_idn_lives: {
            $sum: {
              $cond: [{ $eq: ['$type', 'idn'] }, 1, 0],
            },
          },
          total_gift: { $sum: { $ifNull: ['$c_gift', 0] } },
          total_comments: { $sum: { $ifNull: ['$live_info.comments.num', 0] } },
          total_duration: { $sum: { $ifNull: ['$live_info.duration', 0] } },
          avg_duration: { $avg: { $ifNull: ['$live_info.duration', 0] } },
          avg_viewer: { $avg: { $ifNull: ['$live_info.viewers.peak', 0] } },
          max_viewer: { $max: { $ifNull: ['$live_info.viewers.peak', 0] } },
          longest_duration: { $max: { $ifNull: ['$live_info.duration', 0] } },
          last_live_at: { $first: '$live_info.date.end' },
          last_data_id: { $first: '$data_id' },
          active_day_keys: {
            $addToSet: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$live_info.date.end',
                timezone: TIMEZONE,
              },
            },
          },
        },
      },
      {
        $project: {
          total_lives: 1,
          total_showroom_lives: 1,
          total_idn_lives: 1,
          total_gift: 1,
          total_comments: 1,
          total_duration: 1,
          avg_duration: 1,
          avg_viewer: 1,
          max_viewer: 1,
          longest_duration: 1,
          last_live_at: 1,
          last_data_id: 1,
          active_days: { $size: '$active_day_keys' },
        },
      },
      {
        $sort: {
          total_gift: -1,
          total_lives: -1,
          max_viewer: -1,
        },
      },
    ]),
    LiveLog.aggregate<TopGifterAggregate>([
      {
        $match: match,
      },
      {
        $project: {
          gift_rate: { $ifNull: ['$gift_rate', 0] },
          gift_log: { $ifNull: ['$gift_data.gift_log', []] },
          users: { $ifNull: ['$users', []] },
          data_id: 1,
          ended_at: '$live_info.date.end',
        },
      },
      {
        $unwind: '$gift_log',
      },
      {
        $project: {
          user_id_raw: '$gift_log.user_id',
          total_gift: {
            $multiply: [
              { $ifNull: ['$gift_log.total', 0] },
              {
                $cond: [
                  { $gt: ['$gift_rate', 0] },
                  '$gift_rate',
                  1,
                ],
              },
            ],
          },
          data_id: 1,
          ended_at: 1,
          user_info: {
            $first: {
              $filter: {
                input: '$users',
                as: 'user',
                cond: {
                  $eq: [
                    { $toString: '$$user.user_id' },
                    { $toString: '$gift_log.user_id' },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $sort: {
          ended_at: -1,
        },
      },
      {
        $group: {
          _id: { $toString: '$user_id_raw' },
          user_id: { $first: '$user_id_raw' },
          total_gift: { $sum: '$total_gift' },
          total_lives_supported: { $sum: 1 },
          last_supported_at: { $first: '$ended_at' },
          latest_data_id: { $first: '$data_id' },
          name: { $first: '$user_info.name' },
          avatar_id: { $first: '$user_info.avatar_id' },
          avatar_url: { $first: '$user_info.avatar_url' },
        },
      },
      {
        $sort: {
          total_gift: -1,
        },
      },
      {
        $limit: PREBUILD_TOP_FANS_LIMIT,
      },
      {
        $project: {
          _id: 0,
          user_id: 1,
          name: 1,
          avatar_id: 1,
          avatar_url: 1,
          total_gift: 1,
          total_lives_supported: 1,
          last_supported_at: 1,
          latest_data_id: 1,
        },
      },
    ]),
    LiveLog.aggregate<InsightFacet>([
      {
        $match: match,
      },
      {
        $facet: {
          peak_viewer: [
            {
              $sort: {
                'live_info.viewers.peak': -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 0,
                data_id: 1,
                room_id: 1,
                type: 1,
                ended_at: '$live_info.date.end',
                duration: { $ifNull: ['$live_info.duration', 0] },
                gift: { $ifNull: ['$c_gift', 0] },
                viewers: { $ifNull: ['$live_info.viewers.peak', 0] },
                comments: { $ifNull: ['$live_info.comments.num', 0] },
              },
            },
          ],
          longest_live: [
            {
              $sort: {
                'live_info.duration': -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 0,
                data_id: 1,
                room_id: 1,
                type: 1,
                ended_at: '$live_info.date.end',
                duration: { $ifNull: ['$live_info.duration', 0] },
                gift: { $ifNull: ['$c_gift', 0] },
                viewers: { $ifNull: ['$live_info.viewers.peak', 0] },
                comments: { $ifNull: ['$live_info.comments.num', 0] },
              },
            },
          ],
          biggest_gift: [
            {
              $sort: {
                c_gift: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 0,
                data_id: 1,
                room_id: 1,
                type: 1,
                ended_at: '$live_info.date.end',
                duration: { $ifNull: ['$live_info.duration', 0] },
                gift: { $ifNull: ['$c_gift', 0] },
                viewers: { $ifNull: ['$live_info.viewers.peak', 0] },
                comments: { $ifNull: ['$live_info.comments.num', 0] },
              },
            },
          ],
          most_comments: [
            {
              $sort: {
                'live_info.comments.num': -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                _id: 0,
                data_id: 1,
                room_id: 1,
                type: 1,
                ended_at: '$live_info.date.end',
                duration: { $ifNull: ['$live_info.duration', 0] },
                gift: { $ifNull: ['$c_gift', 0] },
                viewers: { $ifNull: ['$live_info.viewers.peak', 0] },
                comments: { $ifNull: ['$live_info.comments.num', 0] },
              },
            },
          ],
          timeline: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$live_info.date.end',
                    timezone: TIMEZONE,
                  },
                },
                live_count: { $sum: 1 },
                showroom_lives: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'showroom'] }, 1, 0],
                  },
                },
                idn_lives: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'idn'] }, 1, 0],
                  },
                },
                total_gift: { $sum: { $ifNull: ['$c_gift', 0] } },
                total_duration: { $sum: { $ifNull: ['$live_info.duration', 0] } },
                avg_viewer: { $avg: { $ifNull: ['$live_info.viewers.peak', 0] } },
                total_comments: { $sum: { $ifNull: ['$live_info.comments.num', 0] } },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          weekday: [
            {
              $group: {
                _id: {
                  $dayOfWeek: {
                    date: '$live_info.date.end',
                    timezone: TIMEZONE,
                  },
                },
                live_count: { $sum: 1 },
                total_gift: { $sum: { $ifNull: ['$c_gift', 0] } },
                avg_viewer: { $avg: { $ifNull: ['$live_info.viewers.peak', 0] } },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          prime_hours: [
            {
              $group: {
                _id: {
                  $hour: {
                    date: '$live_info.date.end',
                    timezone: TIMEZONE,
                  },
                },
                live_count: { $sum: 1 },
                total_gift: { $sum: { $ifNull: ['$c_gift', 0] } },
              },
            },
            {
              $sort: {
                live_count: -1,
                total_gift: -1,
                _id: 1,
              },
            },
            {
              $limit: 5,
            },
          ],
          unique_gifters: [
            {
              $project: {
                gift_log: { $ifNull: ['$gift_data.gift_log', []] },
              },
            },
            {
              $unwind: '$gift_log',
            },
            {
              $group: {
                _id: { $toString: '$gift_log.user_id' },
              },
            },
            {
              $count: 'total',
            },
          ],
        },
      },
    ]),
  ])

  const memberMap = new Map<number, IMember>()
  for (const member of members) {
    if (member.room_id != null) {
      memberMap.set(member.room_id, member)
    }
  }

  const memberStats = memberAgg.map((row) => {
    const memberData = getMemberBase(memberMap.get(row._id), row._id, group)
    const safeLives = row.total_lives || 1
    const giftPerLive = row.total_gift / safeLives
    const commentsPerLive = row.total_comments / safeLives
    const viewerPerLive = row.avg_viewer
    const engagementScore = viewerPerLive * 0.5 + giftPerLive * 0.35 + commentsPerLive * 0.15

    return {
      room_id: row._id,
      member: memberData,
      stats: {
        total_lives: row.total_lives,
        total_showroom_lives: row.total_showroom_lives,
        total_idn_lives: row.total_idn_lives,
        total_gift: Math.round(row.total_gift || 0),
        total_comments: Math.round(row.total_comments || 0),
        total_duration: Math.round(row.total_duration || 0),
        avg_duration: Math.floor(row.avg_duration || 0),
        avg_viewer: Math.floor(row.avg_viewer || 0),
        max_viewer: Math.round(row.max_viewer || 0),
        longest_duration: Math.round(row.longest_duration || 0),
        active_days: row.active_days || 0,
        gift_per_live: Math.round(giftPerLive || 0),
        comments_per_live: Math.round(commentsPerLive || 0),
        engagement_score: Number(engagementScore.toFixed(2)),
        last_live_at: row.last_live_at,
        last_data_id: row.last_data_id,
      },
    }
  })

  const insightAgg = insightAggRaw?.[0] || {
    peak_viewer: [],
    longest_live: [],
    biggest_gift: [],
    most_comments: [],
    timeline: [],
    weekday: [],
    prime_hours: [],
    unique_gifters: [],
  }

  const timeline = (insightAgg.timeline || []).map(day => ({
    date: day._id,
    live_count: day.live_count || 0,
    showroom_lives: day.showroom_lives || 0,
    idn_lives: day.idn_lives || 0,
    total_gift: Math.round(day.total_gift || 0),
    avg_viewer: Math.floor(day.avg_viewer || 0),
    avg_duration: day.live_count > 0 ? Math.floor((day.total_duration || 0) / day.live_count) : 0,
    total_comments: Math.round(day.total_comments || 0),
  }))

  const totalMembers = memberStats.length
  const aggregateSummary = memberStats.reduce((acc, curr) => {
    acc.total_lives += curr.stats.total_lives
    acc.total_showroom_lives += curr.stats.total_showroom_lives
    acc.total_idn_lives += curr.stats.total_idn_lives
    acc.total_gift += curr.stats.total_gift
    acc.total_comments += curr.stats.total_comments
    acc.total_avg_duration += curr.stats.avg_duration
    acc.total_avg_viewer += curr.stats.avg_viewer
    return acc
  }, {
    total_lives: 0,
    total_showroom_lives: 0,
    total_idn_lives: 0,
    total_gift: 0,
    total_comments: 0,
    total_avg_duration: 0,
    total_avg_viewer: 0,
  })

  const totalLives = aggregateSummary.total_lives
  const totalShowroomLives = aggregateSummary.total_showroom_lives
  const totalIdnLives = aggregateSummary.total_idn_lives
  const highestDailyLiveCount = timeline.reduce((max, row) => Math.max(max, row.live_count), 0)

  const unresolvedDataIds = [...new Set(
    topGifterAgg
      .filter(item => isUnknownUserName(item.name) && item.latest_data_id)
      .map(item => item.latest_data_id as string),
  )]

  const userLogLookup = new Map<string, Map<string, { name?: string, avatar_id?: number, avatar_url?: string }>>()
  if (unresolvedDataIds.length > 0) {
    const userLogs = await UserLog.find({
      data_id: { $in: unresolvedDataIds },
    })
      .select({
        _id: 0,
        data_id: 1,
        users: 1,
      })
      .lean() as UserLogLookupDoc[]

    for (const log of userLogs) {
      const usersMap = new Map<string, { name?: string, avatar_id?: number, avatar_url?: string }>()
      for (const user of (log.users || [])) {
        usersMap.set(String(user.user_id), {
          name: user.name,
          avatar_id: user.avatar_id,
          avatar_url: user.avatar_url,
        })
      }
      userLogLookup.set(log.data_id, usersMap)
    }
  }

  const topGifters = topGifterAgg.map((item) => {
    let name = item.name
    let avatarId = item.avatar_id
    let avatarUrl = item.avatar_url

    if (item.latest_data_id) {
      const fallbackUser = userLogLookup
        .get(item.latest_data_id)
        ?.get(String(item.user_id))
      if (fallbackUser) {
        if (isUnknownUserName(name)) {
          name = fallbackUser.name
        }
        if (avatarId == null) {
          avatarId = fallbackUser.avatar_id
        }
        if (!avatarUrl) {
          avatarUrl = fallbackUser.avatar_url
        }
      }
    }

    return {
      user_id: item.user_id,
      name: isUnknownUserName(name) ? 'Unknown' : name as string,
      avatar_id: avatarId,
      avatar_url: avatarUrl,
      total_gift: Math.round(item.total_gift || 0),
      total_lives_supported: item.total_lives_supported || 0,
      last_supported_at: item.last_supported_at,
    }
  })

  return {
    meta: {
      ...baseMeta,
      live_count: totalLives,
    },
    summary: {
      total_members: totalMembers,
      total_lives: totalLives,
      total_showroom_lives: totalShowroomLives,
      total_idn_lives: totalIdnLives,
      platform_share: {
        showroom_pct: totalLives > 0 ? Number(((totalShowroomLives / totalLives) * 100).toFixed(2)) : 0,
        idn_pct: totalLives > 0 ? Number(((totalIdnLives / totalLives) * 100).toFixed(2)) : 0,
      },
      total_gift: aggregateSummary.total_gift,
      avg_gift_per_live: totalLives > 0 ? Math.round(aggregateSummary.total_gift / totalLives) : 0,
      avg_duration: totalMembers > 0 ? Math.floor(aggregateSummary.total_avg_duration / totalMembers) : 0,
      avg_viewer: totalMembers > 0 ? Math.floor(aggregateSummary.total_avg_viewer / totalMembers) : 0,
      total_comments: aggregateSummary.total_comments,
      unique_gifters: insightAgg.unique_gifters?.[0]?.total || 0,
      active_days: timeline.length,
      highest_daily_live_count: highestDailyLiveCount,
    },
    members: memberStats,
    top_gifters: topGifters,
    content: {
      leaderboards: {
        by_total_gift: mapTopMember(memberStats, item => item.stats.total_gift, 'total_gift', 'Top Gift'),
        by_live_count: mapTopMember(memberStats, item => item.stats.total_lives, 'total_lives', 'Most Lives'),
        by_avg_viewer: mapTopMember(memberStats, item => item.stats.avg_viewer, 'avg_viewer', 'Highest Average Viewer'),
        by_max_viewer: mapTopMember(memberStats, item => item.stats.max_viewer, 'max_viewer', 'Peak Viewer'),
        by_engagement: mapTopMember(memberStats, item => item.stats.engagement_score, 'engagement_score', 'Engagement Score'),
        by_active_days: mapTopMember(memberStats, item => item.stats.active_days, 'active_days', 'Most Active Days'),
      },
      highlights: [
        mapHighlight('peak_viewer_live', 'Peak Viewer Live', insightAgg.peak_viewer?.[0], memberMap, group),
        mapHighlight('longest_live', 'Longest Live', insightAgg.longest_live?.[0], memberMap, group),
        mapHighlight('biggest_gift_live', 'Biggest Gift Live', insightAgg.biggest_gift?.[0], memberMap, group),
        mapHighlight('most_comments_live', 'Most Comments Live', insightAgg.most_comments?.[0], memberMap, group),
      ].filter((i): i is NonNullable<typeof i> => Boolean(i)),
      weekday_breakdown: (insightAgg.weekday || []).map(day => ({
        day: day._id,
        label: getWeekdayName(day._id),
        live_count: day.live_count || 0,
        total_gift: Math.round(day.total_gift || 0),
        avg_viewer: Math.floor(day.avg_viewer || 0),
      })),
      prime_hours: (insightAgg.prime_hours || []).map(hour => ({
        hour: hour._id,
        live_count: hour.live_count || 0,
        total_gift: Math.round(hour.total_gift || 0),
      })),
    },
    timeline,
  }
}

async function buildAndStoreMonthlySnapshot(group: SupportedGroup, monthDate: dayjs.Dayjs): Promise<SnapshotDoc> {
  const month = monthDate.startOf('month').format('YYYY-MM')
  const payload = await buildMonthlyPayload(group, monthDate)
  const generatedAt = new Date()

  const doc: SnapshotDoc = {
    key: getSnapshotKey(group, month),
    type: STATS_TYPE,
    group,
    month,
    date: {
      from: payload.meta.from,
      to: payload.meta.to,
    },
    generated_at: generatedAt,
    version: SNAPSHOT_VERSION,
    payload: {
      ...payload,
      meta: {
        ...payload.meta,
        generated_at: generatedAt.toISOString(),
      },
    },
  }

  await StatsModel.updateOne(
    {
      type: STATS_TYPE,
      group,
      month,
    },
    {
      $set: doc,
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return doc
}

async function ensureMonthlySnapshot(group: SupportedGroup, monthDate: dayjs.Dayjs): Promise<SnapshotDoc> {
  const month = monthDate.startOf('month').format('YYYY-MM')
  const stored = await getStoredSnapshot(group, month)
  if (stored) return stored

  return await singleflight.do(`stats-prebuild:${group}:${month}`, async () => {
    const recheck = await getStoredSnapshot(group, month)
    if (recheck) return recheck
    return await buildAndStoreMonthlySnapshot(group, monthDate)
  }) as SnapshotDoc
}

function withTopFansLimit(payload: any, topFansLimit: number) {
  const topGifters = (payload.top_gifters || []).slice(0, topFansLimit)
  return {
    ...payload,
    meta: {
      ...payload.meta,
      top_fans_limit: topFansLimit,
      top_fans_available: (payload.top_gifters || []).length,
    },
    top_gifters: topGifters,
  }
}

export async function stats(c: Context) {
  const group = parseGroup(c.req.query('group'))
  const monthDate = parseMonth(c.req.query('month'))
  const month = monthDate.format('YYYY-MM')
  const topFansLimit = parseTopFansLimit(c.req.query('top_fans'))

  const cacheKey = `stats-v6:${group}:${month}:${topFansLimit}`
  return await cache.fetch(cacheKey, async () => {
    const snapshot = await ensureMonthlySnapshot(group, monthDate)
    return withTopFansLimit(snapshot.payload, topFansLimit)
  }, SNAPSHOT_CACHE_TTL_MS)
}

export async function getStatsMonths(c: Context) {
  const group = parseGroup(c.req.query('group'))
  const cacheKey = `stats-v6:months:${group}`
  return await cache.fetch(cacheKey, async () => {
    const docs = await StatsModel.find({
      type: STATS_TYPE,
      group,
    })
      .select({
        '_id': 0,
        'month': 1,
        'date': 1,
        'generated_at': 1,
        'payload.summary.total_members': 1,
        'payload.summary.total_lives': 1,
        'payload.summary.total_gift': 1,
      })
      .sort({ month: -1 })
      .lean() as SnapshotDoc[]

    return {
      type: STATS_TYPE,
      group,
      total_months: docs.length,
      months: docs.map((doc) => {
        return {
          month: doc.month,
          from: doc.date?.from,
          to: doc.date?.to,
          generated_at: doc.generated_at,
          summary: doc.payload?.summary || {},
        }
      }),
    }
  }, MONTH_LIST_CACHE_TTL_MS)
}

async function buildMonthlyPayloadNoAggregate(group: SupportedGroup, monthDate: dayjs.Dayjs) {
  const month = monthDate.startOf('month')
  const from = month.toDate()
  const to = month.endOf('month').toDate()
  const monthKey = month.format('YYYY-MM')
  const members = await getMembers(group)
  const roomIds = members
    .map(i => i.room_id)
    .filter((i): i is number => Number.isFinite(i))

  const baseMeta = {
    id: getSnapshotKey(group, monthKey),
    type: STATS_TYPE,
    group,
    month: monthKey,
    from,
    to,
    timezone: TIMEZONE,
    source: 'prebuilt',
    gift_unit: 'idr',
    room_count: roomIds.length,
  }

  if (!roomIds.length) {
    return {
      meta: {
        ...baseMeta,
        live_count: 0,
      },
      summary: {
        total_members: 0,
        total_lives: 0,
        total_showroom_lives: 0,
        total_idn_lives: 0,
        platform_share: {
          showroom_pct: 0,
          idn_pct: 0,
        },
        total_gift: 0,
        avg_gift_per_live: 0,
        avg_duration: 0,
        avg_viewer: 0,
        total_comments: 0,
        unique_gifters: 0,
        active_days: 0,
        highest_daily_live_count: 0,
      },
      members: [],
      top_gifters: [],
      content: {
        leaderboards: {
          by_total_gift: [],
          by_live_count: [],
          by_avg_viewer: [],
          by_max_viewer: [],
          by_engagement: [],
          by_active_days: [],
        },
        highlights: [],
        weekday_breakdown: [],
        prime_hours: [],
      },
      timeline: [],
    }
  }

  const match: Record<string, unknown> = {
    'room_id': { $in: roomIds },
    'live_info.date.end': {
      $gte: from,
      $lte: to,
    },
  }

  if (process.env.NODE_ENV !== 'development') {
    match.is_dev = false
  }

  interface MonthlyGiftLog {
    user_id?: string | number | null
    total?: number | null
  }

  interface MonthlyUserInfo {
    user_id: string | number
    name?: string
    avatar_id?: number
    avatar_url?: string
  }

  interface MonthlyLiveLogDoc {
    data_id?: string
    room_id?: number
    type?: Log.Type
    c_gift?: number
    gift_rate?: number
    gift_data?: {
      gift_log?: MonthlyGiftLog[]
    }
    users?: MonthlyUserInfo[]
    live_info?: {
      duration?: number
      viewers?: {
        peak?: number
      }
      comments?: {
        num?: number
      }
      date?: {
        end?: Date | string | null
      }
    }
  }

  interface MemberAccumulator {
    room_id: number
    total_lives: number
    total_showroom_lives: number
    total_idn_lives: number
    total_gift: number
    total_comments: number
    total_duration: number
    total_viewer: number
    max_viewer: number
    longest_duration: number
    last_live_at: Date | null
    last_data_id: string | null
    active_day_keys: Set<string>
  }

  interface TopGifterAccumulator {
    user_id: string | number
    name?: string
    avatar_id?: number
    avatar_url?: string
    total_gift: number
    total_lives_supported: number
    last_supported_at: Date | null
    latest_data_id?: string
  }

  interface TimelineAccumulator {
    _id: string
    live_count: number
    showroom_lives: number
    idn_lives: number
    total_gift: number
    total_duration: number
    total_viewer: number
    total_comments: number
  }

  interface WeekdayAccumulator {
    _id: number
    live_count: number
    total_gift: number
    total_viewer: number
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  })

  const weekdayMap: Record<string, number> = {
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
    Sat: 7,
  }

  const getDateParts = (date: Date) => {
    const parts = dateFormatter.formatToParts(date)
    const values: Record<string, string> = {}
    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = part.value
      }
    }

    const year = values.year || '1970'
    const monthPart = values.month || '01'
    const dayPart = values.day || '01'
    const parsedHour = Number.parseInt(values.hour || '0', 10)

    return {
      day_key: `${year}-${monthPart}-${dayPart}`,
      weekday: weekdayMap[values.weekday || ''] || 0,
      hour: Number.isFinite(parsedHour) ? parsedHour : 0,
    }
  }

  const memberAccumulator = new Map<number, MemberAccumulator>()
  const topGifterAccumulator = new Map<string, TopGifterAccumulator>()
  const timelineAccumulator = new Map<string, TimelineAccumulator>()
  const weekdayAccumulator = new Map<number, WeekdayAccumulator>()
  const primeHoursAccumulator = new Map<number, PrimeHourRow>()
  const uniqueGifters = new Set<string>()

  let peakViewerLive: HighlightLive | undefined
  let longestLive: HighlightLive | undefined
  let biggestGiftLive: HighlightLive | undefined
  let mostCommentsLive: HighlightLive | undefined

  const logsCursor = LiveLog.find(match)
    .select({
      '_id': 0,
      'data_id': 1,
      'room_id': 1,
      'type': 1,
      'c_gift': 1,
      'gift_rate': 1,
      'gift_data.gift_log': 1,
      'users': 1,
      'live_info.duration': 1,
      'live_info.viewers.peak': 1,
      'live_info.comments.num': 1,
      'live_info.date.end': 1,
    })
    .lean()
    .cursor() as AsyncIterable<MonthlyLiveLogDoc>

  for await (const log of logsCursor) {
    const roomId = Number(log.room_id)
    if (!Number.isFinite(roomId)) continue

    const endedAtRaw = log.live_info?.date?.end
    if (!endedAtRaw) continue

    const endedAt = new Date(endedAtRaw)
    if (Number.isNaN(endedAt.getTime())) continue

    const duration = Number(log.live_info?.duration || 0)
    const viewers = Number(log.live_info?.viewers?.peak || 0)
    const comments = Number(log.live_info?.comments?.num || 0)
    const gift = Number(log.c_gift || 0)
    const dataId = log.data_id || ''
    const liveType = log.type
    const dateParts = getDateParts(endedAt)

    const memberRow = memberAccumulator.get(roomId) || {
      room_id: roomId,
      total_lives: 0,
      total_showroom_lives: 0,
      total_idn_lives: 0,
      total_gift: 0,
      total_comments: 0,
      total_duration: 0,
      total_viewer: 0,
      max_viewer: 0,
      longest_duration: 0,
      last_live_at: null,
      last_data_id: null,
      active_day_keys: new Set<string>(),
    }

    memberRow.total_lives += 1
    if (liveType === 'showroom') memberRow.total_showroom_lives += 1
    if (liveType === 'idn') memberRow.total_idn_lives += 1
    memberRow.total_gift += gift
    memberRow.total_comments += comments
    memberRow.total_duration += duration
    memberRow.total_viewer += viewers
    memberRow.max_viewer = Math.max(memberRow.max_viewer, viewers)
    memberRow.longest_duration = Math.max(memberRow.longest_duration, duration)
    memberRow.active_day_keys.add(dateParts.day_key)
    if (!memberRow.last_live_at || endedAt > memberRow.last_live_at) {
      memberRow.last_live_at = endedAt
      memberRow.last_data_id = dataId || null
    }
    memberAccumulator.set(roomId, memberRow)

    const timelineRow = timelineAccumulator.get(dateParts.day_key) || {
      _id: dateParts.day_key,
      live_count: 0,
      showroom_lives: 0,
      idn_lives: 0,
      total_gift: 0,
      total_duration: 0,
      total_viewer: 0,
      total_comments: 0,
    }

    timelineRow.live_count += 1
    if (liveType === 'showroom') timelineRow.showroom_lives += 1
    if (liveType === 'idn') timelineRow.idn_lives += 1
    timelineRow.total_gift += gift
    timelineRow.total_duration += duration
    timelineRow.total_viewer += viewers
    timelineRow.total_comments += comments
    timelineAccumulator.set(dateParts.day_key, timelineRow)

    if (dateParts.weekday > 0) {
      const weekdayRow = weekdayAccumulator.get(dateParts.weekday) || {
        _id: dateParts.weekday,
        live_count: 0,
        total_gift: 0,
        total_viewer: 0,
      }
      weekdayRow.live_count += 1
      weekdayRow.total_gift += gift
      weekdayRow.total_viewer += viewers
      weekdayAccumulator.set(dateParts.weekday, weekdayRow)
    }

    const primeHourRow = primeHoursAccumulator.get(dateParts.hour) || {
      _id: dateParts.hour,
      live_count: 0,
      total_gift: 0,
    }
    primeHourRow.live_count += 1
    primeHourRow.total_gift += gift
    primeHoursAccumulator.set(dateParts.hour, primeHourRow)

    const liveSummary: HighlightLive = {
      data_id: dataId,
      room_id: roomId,
      type: liveType || 'showroom',
      ended_at: endedAt,
      duration,
      gift,
      viewers,
      comments,
    }

    if (!peakViewerLive || liveSummary.viewers > peakViewerLive.viewers) {
      peakViewerLive = liveSummary
    }
    if (!longestLive || liveSummary.duration > longestLive.duration) {
      longestLive = liveSummary
    }
    if (!biggestGiftLive || liveSummary.gift > biggestGiftLive.gift) {
      biggestGiftLive = liveSummary
    }
    if (!mostCommentsLive || liveSummary.comments > mostCommentsLive.comments) {
      mostCommentsLive = liveSummary
    }

    const giftRate = Number(log.gift_rate)
    const appliedGiftRate = Number.isFinite(giftRate) && giftRate > 0 ? giftRate : 1
    const users = Array.isArray(log.users) ? log.users : []
    const usersById = new Map<string, MonthlyUserInfo>()
    for (const user of users) {
      usersById.set(String(user.user_id), user)
    }

    const giftLogs = Array.isArray(log.gift_data?.gift_log) ? log.gift_data?.gift_log : []
    for (const giftLog of giftLogs) {
      const userIdRaw = giftLog?.user_id
      if (userIdRaw == null) continue

      const userId = String(userIdRaw)
      uniqueGifters.add(userId)

      const totalGiftRaw = Number(giftLog?.total || 0)
      const totalGift = Number.isFinite(totalGiftRaw) ? totalGiftRaw * appliedGiftRate : 0
      const userInfo = usersById.get(userId)

      const gifter = topGifterAccumulator.get(userId) || {
        user_id: userIdRaw,
        name: userInfo?.name,
        avatar_id: userInfo?.avatar_id,
        avatar_url: userInfo?.avatar_url,
        total_gift: 0,
        total_lives_supported: 0,
        last_supported_at: null,
        latest_data_id: undefined,
      }

      gifter.total_gift += totalGift
      gifter.total_lives_supported += 1

      if (!gifter.last_supported_at || endedAt > gifter.last_supported_at) {
        gifter.last_supported_at = endedAt
        gifter.latest_data_id = dataId || undefined
        if (userInfo?.name) gifter.name = userInfo.name
        if (userInfo?.avatar_id != null) gifter.avatar_id = userInfo.avatar_id
        if (userInfo?.avatar_url) gifter.avatar_url = userInfo.avatar_url
      }

      if (isUnknownUserName(gifter.name) && userInfo?.name) {
        gifter.name = userInfo.name
      }
      if (gifter.avatar_id == null && userInfo?.avatar_id != null) {
        gifter.avatar_id = userInfo.avatar_id
      }
      if (!gifter.avatar_url && userInfo?.avatar_url) {
        gifter.avatar_url = userInfo.avatar_url
      }

      topGifterAccumulator.set(userId, gifter)
    }
  }

  const memberAgg: MemberAggregate[] = [...memberAccumulator.values()]
    .map((row) => {
      const safeLives = row.total_lives || 1
      return {
        _id: row.room_id,
        total_lives: row.total_lives,
        total_showroom_lives: row.total_showroom_lives,
        total_idn_lives: row.total_idn_lives,
        total_gift: row.total_gift,
        total_comments: row.total_comments,
        total_duration: row.total_duration,
        avg_duration: row.total_duration / safeLives,
        avg_viewer: row.total_viewer / safeLives,
        max_viewer: row.max_viewer,
        longest_duration: row.longest_duration,
        last_live_at: row.last_live_at,
        last_data_id: row.last_data_id,
        active_days: row.active_day_keys.size,
      }
    })
    .sort((a, b) => {
      if (b.total_gift !== a.total_gift) return b.total_gift - a.total_gift
      if (b.total_lives !== a.total_lives) return b.total_lives - a.total_lives
      return b.max_viewer - a.max_viewer
    })

  const topGifterAgg: TopGifterAggregate[] = [...topGifterAccumulator.values()]
    .sort((a, b) => b.total_gift - a.total_gift)
    .slice(0, PREBUILD_TOP_FANS_LIMIT)

  const insightAgg: InsightFacet = {
    peak_viewer: peakViewerLive ? [peakViewerLive] : [],
    longest_live: longestLive ? [longestLive] : [],
    biggest_gift: biggestGiftLive ? [biggestGiftLive] : [],
    most_comments: mostCommentsLive ? [mostCommentsLive] : [],
    timeline: [...timelineAccumulator.values()]
      .sort((a, b) => a._id.localeCompare(b._id))
      .map((row): TimelineRow => ({
        _id: row._id,
        live_count: row.live_count,
        showroom_lives: row.showroom_lives,
        idn_lives: row.idn_lives,
        total_gift: row.total_gift,
        total_duration: row.total_duration,
        avg_viewer: row.live_count > 0 ? row.total_viewer / row.live_count : 0,
        total_comments: row.total_comments,
      })),
    weekday: [...weekdayAccumulator.values()]
      .sort((a, b) => a._id - b._id)
      .map((row): WeekdayRow => ({
        _id: row._id,
        live_count: row.live_count,
        total_gift: row.total_gift,
        avg_viewer: row.live_count > 0 ? row.total_viewer / row.live_count : 0,
      })),
    prime_hours: [...primeHoursAccumulator.values()]
      .sort((a, b) => {
        if (b.live_count !== a.live_count) return b.live_count - a.live_count
        if (b.total_gift !== a.total_gift) return b.total_gift - a.total_gift
        return a._id - b._id
      })
      .slice(0, 5),
    unique_gifters: [{
      total: uniqueGifters.size,
    }],
  }

  const memberMap = new Map<number, IMember>()
  for (const member of members) {
    if (member.room_id != null) {
      memberMap.set(member.room_id, member)
    }
  }

  const memberStats = memberAgg.map((row) => {
    const memberData = getMemberBase(memberMap.get(row._id), row._id, group)
    const safeLives = row.total_lives || 1
    const giftPerLive = row.total_gift / safeLives
    const commentsPerLive = row.total_comments / safeLives
    const viewerPerLive = row.avg_viewer
    const engagementScore = viewerPerLive * 0.5 + giftPerLive * 0.35 + commentsPerLive * 0.15

    return {
      room_id: row._id,
      member: memberData,
      stats: {
        total_lives: row.total_lives,
        total_showroom_lives: row.total_showroom_lives,
        total_idn_lives: row.total_idn_lives,
        total_gift: Math.round(row.total_gift || 0),
        total_comments: Math.round(row.total_comments || 0),
        total_duration: Math.round(row.total_duration || 0),
        avg_duration: Math.floor(row.avg_duration || 0),
        avg_viewer: Math.floor(row.avg_viewer || 0),
        max_viewer: Math.round(row.max_viewer || 0),
        longest_duration: Math.round(row.longest_duration || 0),
        active_days: row.active_days || 0,
        gift_per_live: Math.round(giftPerLive || 0),
        comments_per_live: Math.round(commentsPerLive || 0),
        engagement_score: Number(engagementScore.toFixed(2)),
        last_live_at: row.last_live_at,
        last_data_id: row.last_data_id,
      },
    }
  })

  const timeline = (insightAgg.timeline || []).map(day => ({
    date: day._id,
    live_count: day.live_count || 0,
    showroom_lives: day.showroom_lives || 0,
    idn_lives: day.idn_lives || 0,
    total_gift: Math.round(day.total_gift || 0),
    avg_viewer: Math.floor(day.avg_viewer || 0),
    avg_duration: day.live_count > 0 ? Math.floor((day.total_duration || 0) / day.live_count) : 0,
    total_comments: Math.round(day.total_comments || 0),
  }))

  const totalMembers = memberStats.length
  const aggregateSummary = memberStats.reduce((acc, curr) => {
    acc.total_lives += curr.stats.total_lives
    acc.total_showroom_lives += curr.stats.total_showroom_lives
    acc.total_idn_lives += curr.stats.total_idn_lives
    acc.total_gift += curr.stats.total_gift
    acc.total_comments += curr.stats.total_comments
    acc.total_avg_duration += curr.stats.avg_duration
    acc.total_avg_viewer += curr.stats.avg_viewer
    return acc
  }, {
    total_lives: 0,
    total_showroom_lives: 0,
    total_idn_lives: 0,
    total_gift: 0,
    total_comments: 0,
    total_avg_duration: 0,
    total_avg_viewer: 0,
  })

  const totalLives = aggregateSummary.total_lives
  const totalShowroomLives = aggregateSummary.total_showroom_lives
  const totalIdnLives = aggregateSummary.total_idn_lives
  const highestDailyLiveCount = timeline.reduce((max, row) => Math.max(max, row.live_count), 0)

  const unresolvedDataIds = [...new Set(
    topGifterAgg
      .filter(item => isUnknownUserName(item.name) && item.latest_data_id)
      .map(item => item.latest_data_id as string),
  )]

  const userLogLookup = new Map<string, Map<string, { name?: string, avatar_id?: number, avatar_url?: string }>>()
  if (unresolvedDataIds.length > 0) {
    const userLogs = await UserLog.find({
      data_id: { $in: unresolvedDataIds },
    })
      .select({
        _id: 0,
        data_id: 1,
        users: 1,
      })
      .lean() as UserLogLookupDoc[]

    for (const log of userLogs) {
      const usersMap = new Map<string, { name?: string, avatar_id?: number, avatar_url?: string }>()
      for (const user of (log.users || [])) {
        usersMap.set(String(user.user_id), {
          name: user.name,
          avatar_id: user.avatar_id,
          avatar_url: user.avatar_url,
        })
      }
      userLogLookup.set(log.data_id, usersMap)
    }
  }

  const topGifters = topGifterAgg.map((item) => {
    let name = item.name
    let avatarId = item.avatar_id
    let avatarUrl = item.avatar_url

    if (item.latest_data_id) {
      const fallbackUser = userLogLookup
        .get(item.latest_data_id)
        ?.get(String(item.user_id))
      if (fallbackUser) {
        if (isUnknownUserName(name)) {
          name = fallbackUser.name
        }
        if (avatarId == null) {
          avatarId = fallbackUser.avatar_id
        }
        if (!avatarUrl) {
          avatarUrl = fallbackUser.avatar_url
        }
      }
    }

    return {
      user_id: item.user_id,
      name: isUnknownUserName(name) ? 'Unknown' : name as string,
      avatar_id: avatarId,
      avatar_url: avatarUrl,
      total_gift: Math.round(item.total_gift || 0),
      total_lives_supported: item.total_lives_supported || 0,
      last_supported_at: item.last_supported_at,
    }
  })

  return {
    meta: {
      ...baseMeta,
      live_count: totalLives,
    },
    summary: {
      total_members: totalMembers,
      total_lives: totalLives,
      total_showroom_lives: totalShowroomLives,
      total_idn_lives: totalIdnLives,
      platform_share: {
        showroom_pct: totalLives > 0 ? Number(((totalShowroomLives / totalLives) * 100).toFixed(2)) : 0,
        idn_pct: totalLives > 0 ? Number(((totalIdnLives / totalLives) * 100).toFixed(2)) : 0,
      },
      total_gift: aggregateSummary.total_gift,
      avg_gift_per_live: totalLives > 0 ? Math.round(aggregateSummary.total_gift / totalLives) : 0,
      avg_duration: totalMembers > 0 ? Math.floor(aggregateSummary.total_avg_duration / totalMembers) : 0,
      avg_viewer: totalMembers > 0 ? Math.floor(aggregateSummary.total_avg_viewer / totalMembers) : 0,
      total_comments: aggregateSummary.total_comments,
      unique_gifters: insightAgg.unique_gifters?.[0]?.total || 0,
      active_days: timeline.length,
      highest_daily_live_count: highestDailyLiveCount,
    },
    members: memberStats,
    top_gifters: topGifters,
    content: {
      leaderboards: {
        by_total_gift: mapTopMember(memberStats, item => item.stats.total_gift, 'total_gift', 'Top Gift'),
        by_live_count: mapTopMember(memberStats, item => item.stats.total_lives, 'total_lives', 'Most Lives'),
        by_avg_viewer: mapTopMember(memberStats, item => item.stats.avg_viewer, 'avg_viewer', 'Highest Average Viewer'),
        by_max_viewer: mapTopMember(memberStats, item => item.stats.max_viewer, 'max_viewer', 'Peak Viewer'),
        by_engagement: mapTopMember(memberStats, item => item.stats.engagement_score, 'engagement_score', 'Engagement Score'),
        by_active_days: mapTopMember(memberStats, item => item.stats.active_days, 'active_days', 'Most Active Days'),
      },
      highlights: [
        mapHighlight('peak_viewer_live', 'Peak Viewer Live', insightAgg.peak_viewer?.[0], memberMap, group),
        mapHighlight('longest_live', 'Longest Live', insightAgg.longest_live?.[0], memberMap, group),
        mapHighlight('biggest_gift_live', 'Biggest Gift Live', insightAgg.biggest_gift?.[0], memberMap, group),
        mapHighlight('most_comments_live', 'Most Comments Live', insightAgg.most_comments?.[0], memberMap, group),
      ].filter((i): i is NonNullable<typeof i> => Boolean(i)),
      weekday_breakdown: (insightAgg.weekday || []).map(day => ({
        day: day._id,
        label: getWeekdayName(day._id),
        live_count: day.live_count || 0,
        total_gift: Math.round(day.total_gift || 0),
        avg_viewer: Math.floor(day.avg_viewer || 0),
      })),
      prime_hours: (insightAgg.prime_hours || []).map(hour => ({
        hour: hour._id,
        live_count: hour.live_count || 0,
        total_gift: Math.round(hour.total_gift || 0),
      })),
    },
    timeline,
  }
}

async function buildAndStoreMonthlySnapshotNoAggregate(group: SupportedGroup, monthDate: dayjs.Dayjs): Promise<SnapshotDoc> {
  const month = monthDate.startOf('month').format('YYYY-MM')
  const payload = await buildMonthlyPayloadNoAggregate(group, monthDate)
  const generatedAt = new Date()

  const doc: SnapshotDoc = {
    key: getSnapshotKey(group, month),
    type: STATS_TYPE,
    group,
    month,
    date: {
      from: payload.meta.from,
      to: payload.meta.to,
    },
    generated_at: generatedAt,
    version: SNAPSHOT_VERSION,
    payload: {
      ...payload,
      meta: {
        ...payload.meta,
        generated_at: generatedAt.toISOString(),
      },
    },
  }

  await StatsModel.updateOne(
    {
      type: STATS_TYPE,
      group,
      month,
    },
    {
      $set: doc,
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return doc
}

export async function prebuildMonthlyStatsNoAggregate(groupInput: string | null | undefined, monthInput?: string | null) {
  const group = parseGroup(groupInput)
  const monthDate = parseMonth(monthInput)
  return await buildAndStoreMonthlySnapshotNoAggregate(group, monthDate)
}

export async function prebuildMonthlyStats(groupInput: string | null | undefined, monthInput?: string | null) {
  const group = parseGroup(groupInput)
  const monthDate = parseMonth(monthInput)
  return await buildAndStoreMonthlySnapshot(group, monthDate)
}

export async function prebuildLastMonthStats() {
  const monthDate = dayjs().subtract(1, 'month').startOf('month')
  const result = []
  for (const group of SUPPORTED_GROUPS) {
    result.push(await buildAndStoreMonthlySnapshot(group, monthDate))
  }
  return {
    month: monthDate.format('YYYY-MM'),
    built: result.map(i => ({
      group: i.group,
      month: i.month,
      generated_at: i.generated_at,
    })),
  }
}

export async function rebuildStats(c: Context) {
  const groupQuery = c.req.query('group') || DEFAULT_GROUP
  const groupList = groupQuery === 'all'
    ? [...SUPPORTED_GROUPS]
    : [parseGroup(groupQuery)]
  const monthsCount = parsePositiveInteger(c.req.query('months'), 1, 24)
  const startMonth = parseMonth(c.req.query('month'))
  const built: { group: string, month: string, generated_at: Date, live_count: number }[] = []

  for (const group of groupList) {
    for (let i = 0; i < monthsCount; i++) {
      const targetMonth = startMonth.subtract(i, 'month').startOf('month')
      const doc = await buildAndStoreMonthlySnapshot(group, targetMonth)
      built.push({
        group,
        month: doc.month,
        generated_at: doc.generated_at,
        live_count: doc.payload?.meta?.live_count || 0,
      })
    }
  }

  return {
    ok: true,
    total_built: built.length,
    built,
  }
}
