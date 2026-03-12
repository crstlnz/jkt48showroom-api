import type { Context } from 'hono'
import { ofetch } from 'ofetch'
import config from '@/config'
import { dbConnect } from '@/database'
import LiveLog from '@/database/live/schema/LiveLog'
import ShowroomCompetition from '@/database/live/schema/ShowroomCompetition'
import ShowroomCompetitionTopFans from '@/database/live/schema/ShowroomCompetitionTopFans'
import IdolMember from '@/database/schema/48group/IdolMember'
import Showroom from '@/database/schema/showroom/Showroom'
import UserLog from '@/database/userDB/UserLog'

export interface JKT48ShowroomCompetitionAPI {
  event: Event
  ranking: Ranking[]
}

export interface Event {
  event_name: string
  event_type: string
  show_ranking: number
  started_at: number
  ended_at: number
  image: string
  event_url: string
}

export interface Ranking {
  rank: number
  point: number
  room: Room
}

export interface Room {
  room_id: number
  image: string
  image_square: string
  name: string
}

interface RoomExtraInfo {
  image_alt?: string
  slug?: string
  nickname?: string
  key?: string
}

interface CompetitionLiveStats {
  live_count: number
  active_days: number
  total_gift: number
  total_comments: number
  total_duration: number
  avg_duration: number
  avg_gift_per_live: number
  avg_comments_per_live: number
  avg_viewer_peak: number
  max_viewer_peak: number
  total_viewer_peak: number
  point_per_live: number
  point_per_hour: number
  first_live_at: Date | null
  last_live_at: Date | null
}

interface CompetitionTopFan {
  user_id: string
  name: string
  avatar_url: string
  point: number
  gold: number
  c_gift: number
  visit_count: number
  total_comments: number
  contribution_rank: number
}

interface CompetitionRankingDetail extends Ranking {
  gap_above: number | null
  gap_below: number | null
  trend: {
    rank_diff: number | null
    point_diff: number | null
  }
  live: CompetitionLiveStats
  room: Room & RoomExtraInfo & { nickname: string }
}

interface StoredCompetitionRanking {
  rank: number
  point: number
  room: {
    room_id: number
    name: string
    image: string
    image_square: string
  }
}

export interface CompetitionRankingSnapshotResult {
  event_id: number
  snapshot_hour: Date
  scraped_at: Date
  upserted: boolean
  matched_count: number
  modified_count: number
  skipped?: boolean
  reason?: string
}

interface CompetitionLiveStatsAggRow {
  _id: number
  live_count?: number
  total_gift?: number
  total_comments?: number
  total_duration?: number
  avg_viewer_peak?: number
  max_viewer_peak?: number
  total_viewer_peak?: number
  first_live_at?: Date | null
  last_live_at?: Date | null
  active_days_set?: string[]
}

interface ShowroomContributionFan {
  avatar_id?: number
  avatar_url?: string
  point?: number
  name?: string
  user_id?: number | string
  rank?: number
}

interface CompetitionSnapshotMeta {
  snapshot_hour: Date | null
  scraped_at: Date | null
  comparison_snapshot_hour?: Date | null
}

interface CompetitionSnapshotDoc {
  snapshot_hour?: Date | null
  scraped_at?: Date | null
  ranking?: StoredCompetitionRanking[]
}

interface CompetitionTopFansSnapshotDoc {
  top_fans?: CompetitionTopFan[]
}

const emptyLiveStats: CompetitionLiveStats = {
  live_count: 0,
  active_days: 0,
  total_gift: 0,
  total_comments: 0,
  total_duration: 0,
  avg_duration: 0,
  avg_gift_per_live: 0,
  avg_comments_per_live: 0,
  avg_viewer_peak: 0,
  max_viewer_peak: 0,
  total_viewer_peak: 0,
  point_per_live: 0,
  point_per_hour: 0,
  first_live_at: null,
  last_live_at: null,
}

const TOP_FANS_LIMIT = 100

// export const JKT48_SHOWROOM_COMPETITION_START = 1772334000
// export const JKT48_SHOWROOM_COMPETITION_END = 1773500399
export const EVENT_ID = 41907
export const TARGET_ROOM_ID = 509985
export const COMPETITION_URL = `https://www.showroom-live.com/api/events/${EVENT_ID}/ranking?room_id=${TARGET_ROOM_ID}`

export function getSnapshotHour(date = new Date()) {
  const snapshotHour = new Date(date)
  snapshotHour.setMinutes(0, 0, 0)
  return snapshotHour
}

function toNum(value: unknown) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

function normalizeUserId(value: unknown) {
  if (value == null) return ''
  return String(value)
}

async function getCompetition() {
  return ofetch<JKT48ShowroomCompetitionAPI>(COMPETITION_URL)
}

function getEventWindow(event?: Event) {
  return {
    startDate: new Date(toNum(event?.started_at) * 1000),
    endDate: new Date(toNum(event?.ended_at) * 1000),
  }
}

function getRankingRoomIds(rows: Ranking[]) {
  return Array.from(new Set(
    rows
      .map(i => toNum(i.room.room_id))
      .filter((i): i is number => Number.isFinite(i) && i > 0),
  ))
}

async function getCompetitionRankingBase(result: JKT48ShowroomCompetitionAPI) {
  const sortedRankings = toCompetitionRankings(result.ranking)
  const roomIds = getRankingRoomIds(sortedRankings)
  const memberMap = await getRoomExtraInfoMap(roomIds)
  return {
    sortedRankings,
    roomIds,
    memberMap,
  }
}

function toCompetitionRankings(rows: Ranking[]): Ranking[] {
  const sorted = [...rows]
    .map(row => ({
      ...row,
      rank: toNum(row.rank),
      point: toNum(row.point),
    }))
    .sort((a, b) => {
      const pointDiff = b.point - a.point
      if (pointDiff !== 0) return pointDiff

      const rankDiff = a.rank - b.rank
      if (rankDiff !== 0) return rankDiff

      return toNum(a.room.room_id) - toNum(b.room.room_id)
    })

  let prevPoint: number | null = null
  let currentRank = 0

  return sorted.map((row, idx) => {
    if (prevPoint == null || row.point < prevPoint) {
      currentRank = idx + 1
      prevPoint = row.point
    }

    return {
      ...row,
      rank: currentRank,
    }
  })
}

function enrichRoom(room: Room, extra?: RoomExtraInfo) {
  return {
    ...room,
    image_alt: extra?.image_alt,
    slug: extra?.slug,
    key: extra?.key,
    nickname: extra?.nickname || room.name,
  }
}

function withPointStats(stats: CompetitionLiveStats, point: number): CompetitionLiveStats {
  return {
    ...stats,
    point_per_live: stats.live_count > 0 ? Math.round(point / stats.live_count) : 0,
    point_per_hour: stats.total_duration > 0 ? Math.round(point / (stats.total_duration / 3600)) : 0,
  }
}

function toStoredRanking(row: CompetitionRankingDetail): StoredCompetitionRanking {
  return {
    rank: toNum(row.rank),
    point: toNum(row.point),
    room: {
      room_id: toNum(row.room.room_id),
      name: row.room.name || '',
      image: row.room.image || '',
      image_square: row.room.image_square || '',
    },
  }
}

async function getRoomExtraInfoMap(roomIds: number[]) {
  await dbConnect('jkt48DB')
  const members = await IdolMember.find({ showroom_id: { $in: roomIds } }).lean()
  const showrooms = await Showroom.find({ room_id: { $in: roomIds } }).lean()
  const memberMap = new Map<number, RoomExtraInfo>()

  for (const member of members) {
    const showroomId = Number(member.showroom_id)
    if (!Number.isFinite(showroomId)) continue
    const room = showrooms.find(i => i.room_id === showroomId)
    memberMap.set(showroomId, {
      image_alt: member?.info?.img,
      slug: member?.slug,
      nickname: member?.info?.nicknames?.[0],
      key: room?.url,
    })
  }

  return memberMap
}

async function getLiveStatsMap(memberIds: number[], eventStartDate: Date, eventEndDate: Date) {
  const liveStatsMap = new Map<number, CompetitionLiveStats>()
  if (memberIds.length === 0) return liveStatsMap

  const rows = await LiveLog.aggregate([
    {
      $match: {
        'type': 'showroom',
        'room_id': { $in: memberIds },
        'live_info.date.start': { $lte: eventEndDate },
        'live_info.date.end': { $gte: eventStartDate },
      },
    },
    {
      $group: {
        _id: '$room_id',
        live_count: { $sum: 1 },
        total_gift: {
          $sum: {
            $ifNull: ['$total_gifts', 0],
          },
        },
        total_comments: { $sum: { $ifNull: ['$live_info.comments.num', 0] } },
        total_duration: { $sum: { $ifNull: ['$live_info.duration', 0] } },
        avg_viewer_peak: { $avg: { $ifNull: ['$live_info.viewers.peak', 0] } },
        max_viewer_peak: { $max: { $ifNull: ['$live_info.viewers.peak', 0] } },
        total_viewer_peak: { $sum: { $ifNull: ['$live_info.viewers.peak', 0] } },
        first_live_at: { $min: '$live_info.date.start' },
        last_live_at: { $max: '$live_info.date.end' },
        active_days_set: {
          $addToSet: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$live_info.date.start',
              timezone: 'Asia/Jakarta',
            },
          },
        },
      },
    },
  ]) as CompetitionLiveStatsAggRow[]

  for (const row of rows) {
    const roomId = Number(row._id)
    if (!Number.isFinite(roomId)) continue

    const liveCount = toNum(row.live_count)
    const totalGift = Math.round(toNum(row.total_gift))
    const totalComments = toNum(row.total_comments)
    const totalDuration = toNum(row.total_duration)

    liveStatsMap.set(roomId, {
      live_count: liveCount,
      active_days: Array.isArray(row.active_days_set) ? row.active_days_set.length : 0,
      total_gift: totalGift,
      total_comments: totalComments,
      total_duration: totalDuration,
      avg_duration: liveCount > 0 ? Math.round(totalDuration / liveCount) : 0,
      avg_gift_per_live: liveCount > 0 ? Math.round(totalGift / liveCount) : 0,
      avg_comments_per_live: liveCount > 0 ? Math.round(totalComments / liveCount) : 0,
      avg_viewer_peak: Math.round(toNum(row.avg_viewer_peak)),
      max_viewer_peak: toNum(row.max_viewer_peak),
      total_viewer_peak: toNum(row.total_viewer_peak),
      point_per_live: 0,
      point_per_hour: 0,
      first_live_at: row.first_live_at || null,
      last_live_at: row.last_live_at || null,
    })
  }

  return liveStatsMap
}

async function fetchCompetitionTopFansForRoom(roomId: number, eventId: number, eventStartDate: Date, eventEndDate: Date) {
  const matchCondition = {
    'type': 'showroom',
    'room_id': roomId,
    'live_info.date.start': { $lte: eventEndDate },
    'live_info.date.end': { $gte: eventStartDate },
  }

  const giftRows = await LiveLog.aggregate([
    {
      $match: matchCondition,
    },
    {
      $unwind: {
        path: '$gift_data.gift_log',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: {
          user_id: '$gift_data.gift_log.user_id',
        },
        total_gift: { $sum: { $ifNull: ['$gift_data.gift_log.total', 0] } },
        total_c_gift: {
          $sum: {
            $multiply: [
              { $ifNull: ['$gift_data.gift_log.total', 0] },
              { $ifNull: ['$gift_rate', 0] },
            ],
          },
        },
      },
    },
    {
      $sort: {
        total_gift: -1,
      },
    },
  ]) as Array<{ _id: { user_id: unknown }, total_gift?: number, total_c_gift?: number }>

  const localContributionMap = new Map<string, { gold: number, c_gift: number }>()
  for (const row of giftRows) {
    const userId = normalizeUserId(row?._id?.user_id)
    if (!userId) continue
    localContributionMap.set(userId, {
      gold: Math.round(toNum(row.total_gift)),
      c_gift: Math.round(toNum(row.total_c_gift)),
    })
  }

  const res = await ofetch<{ ranking?: ShowroomContributionFan[] }>(
    'https://www.showroom-live.com/api/event/contribution_ranking',
    {
      query: {
        room_id: roomId,
        event_id: eventId,
      },
    },
  )
  const ranking = Array.isArray(res?.ranking) ? res.ranking : []
  const topRanking = ranking.slice(0, TOP_FANS_LIMIT)
  const topUserIds = topRanking
    .map(fan => normalizeUserId(fan.user_id))
    .filter(userId => !!userId)

  let visitMap = new Map<string, { visit_count: number, total_comments: number }>()
  if (topUserIds.length > 0) {
    const liveDocs = await LiveLog.find(matchCondition).select({ _id: 0, data_id: 1 }).lean() as Array<{ data_id?: string }>
    const dataIds = Array.from(new Set(
      liveDocs
        .map(doc => String(doc?.data_id || ''))
        .filter(dataId => !!dataId),
    ))

    if (dataIds.length > 0) {
      await dbConnect('userDB')
      const visitRows = await UserLog.aggregate([
        {
          $match: {
            data_id: { $in: dataIds },
          },
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            user_id_str: {
              $toString: '$users.user_id',
            },
            comments: { $ifNull: ['$users.comments', 0] },
          },
        },
        {
          $match: {
            user_id_str: { $in: topUserIds },
          },
        },
        {
          $group: {
            _id: '$user_id_str',
            visit_count: { $sum: 1 },
            total_comments: { $sum: '$comments' },
          },
        },
      ]) as Array<{ _id: string, visit_count?: number, total_comments?: number }>

      visitMap = new Map(
        visitRows.map(row => [
          String(row._id),
          {
            visit_count: toNum(row.visit_count),
            total_comments: toNum(row.total_comments),
          },
        ]),
      )
    }
  }

  return topRanking
    .map((fan) => {
      const userId = normalizeUserId(fan.user_id)
      const local = localContributionMap.get(userId)
      const visit = visitMap.get(userId)
      const avatarId = toNum(fan.avatar_id)
      const avatarUrl = fan.avatar_url || (avatarId > 0 ? config.avatarURL(avatarId) : '')
      return {
        user_id: userId,
        name: fan.name || `User ${userId}`,
        avatar_url: avatarUrl,
        point: Math.round(toNum(fan.point)),
        gold: local?.gold || 0,
        c_gift: local?.c_gift || 0,
        visit_count: visit?.visit_count || 0,
        total_comments: visit?.total_comments || 0,
        contribution_rank: toNum(fan.rank),
      }
    })
    .filter(fan => fan.user_id)
}

export async function getCompetitionTopFans(c: Context) {
  const roomId = toNum(c.req.query('room_id'))
  if (!Number.isFinite(roomId) || roomId <= 0) return [] as CompetitionTopFan[]

  await dbConnect('liveDB')
  const latestSnapshot = await ShowroomCompetitionTopFans.findOne({
    event_id: EVENT_ID,
    room_id: roomId,
  })
    .sort({ snapshot_hour: -1 })
    .select({ _id: 0, top_fans: 1 })
    .lean<CompetitionTopFansSnapshotDoc>()

  return Array.isArray(latestSnapshot?.top_fans) ? latestSnapshot.top_fans : []
}

function toStoredRankingMap(rows?: StoredCompetitionRanking[]) {
  const normalized = [...(rows || [])]
    .map(row => ({
      rank: toNum(row?.rank),
      point: toNum(row?.point),
      room: {
        room_id: toNum(row?.room?.room_id),
        name: row?.room?.name || '',
        image: row?.room?.image || '',
        image_square: row?.room?.image_square || '',
      },
    }))
    .filter(row => Number.isFinite(row.room.room_id) && row.room.room_id > 0)
    .sort((a, b) => {
      const pointDiff = b.point - a.point
      if (pointDiff !== 0) return pointDiff

      const rankDiff = a.rank - b.rank
      if (rankDiff !== 0) return rankDiff

      return a.room.room_id - b.room.room_id
    })

  let prevPoint: number | null = null
  let currentRank = 0

  const competitionRanked = normalized.map((row, idx) => {
    if (prevPoint == null || row.point < prevPoint) {
      currentRank = idx + 1
      prevPoint = row.point
    }

    return {
      ...row,
      rank: currentRank,
    }
  })

  const map = new Map<number, StoredCompetitionRanking>()
  for (const row of competitionRanked) {
    const roomId = row.room.room_id
    map.set(roomId, {
      rank: row.rank,
      point: row.point,
      room: {
        room_id: roomId,
        name: row.room.name,
        image: row.room.image,
        image_square: row.room.image_square,
      },
    })
  }
  return map
}

async function getCompetitionSnapshotContext() {
  const latestSnapshot = await ShowroomCompetition.findOne({ event_id: EVENT_ID })
    .sort({ snapshot_hour: -1 })
    .select({ _id: 0, snapshot_hour: 1, scraped_at: 1, ranking: 1 })
    .lean<CompetitionSnapshotDoc>()

  if (!latestSnapshot || !latestSnapshot.snapshot_hour) {
    return {
      snapshot: null as CompetitionSnapshotMeta | null,
      comparisonRankingMap: new Map<number, StoredCompetitionRanking>(),
    }
  }

  const previousDayTarget = new Date(new Date(latestSnapshot.snapshot_hour).getTime() - (24 * 60 * 60 * 1000))
  let comparisonSnapshot = await ShowroomCompetition.findOne({
    event_id: EVENT_ID,
    snapshot_hour: { $lte: previousDayTarget },
  })
    .sort({ snapshot_hour: -1 })
    .select({ _id: 0, snapshot_hour: 1, ranking: 1 })
    .lean<CompetitionSnapshotDoc>()

  // Fallback: if 24h snapshot is unavailable, use the oldest available snapshot before current.
  if (!comparisonSnapshot || !comparisonSnapshot.snapshot_hour) {
    comparisonSnapshot = await ShowroomCompetition.findOne({
      event_id: EVENT_ID,
      snapshot_hour: { $lt: latestSnapshot.snapshot_hour },
    })
      .sort({ snapshot_hour: 1 })
      .select({ _id: 0, snapshot_hour: 1, ranking: 1 })
      .lean<CompetitionSnapshotDoc>()
  }

  return {
    snapshot: {
      snapshot_hour: latestSnapshot.snapshot_hour || null,
      scraped_at: latestSnapshot.scraped_at || null,
      comparison_snapshot_hour: comparisonSnapshot?.snapshot_hour || null,
    } as CompetitionSnapshotMeta,
    comparisonRankingMap: toStoredRankingMap(comparisonSnapshot?.ranking),
  }
}

export async function getCompetitionRanking() {
  const result = await getCompetition()
  const { sortedRankings, memberMap } = await getCompetitionRankingBase(result)
  const rankings = sortedRankings.map((member) => {
    return {
      ...member,
      room: enrichRoom(member.room, memberMap.get(member.room.room_id)),
    }
  })

  return {
    event: result.event,
    date: new Date().toISOString(),
    rankings,
  }
}
export async function getCompetitionRankingDetails() {
  const result = await getCompetition()
  const { sortedRankings, roomIds, memberMap } = await getCompetitionRankingBase(result)

  await dbConnect('liveDB')
  const { startDate: eventStartDate, endDate: eventEndDate } = getEventWindow(result.event)
  const generatedAt = new Date()
  const snapshotContext = await getCompetitionSnapshotContext()
  const liveStatsMap = await getLiveStatsMap(roomIds, eventStartDate, eventEndDate)

  const rankings: CompetitionRankingDetail[] = sortedRankings.map((member, idx, all) => {
    const point = toNum(member.point)
    const currentRank = toNum(member.rank)
    const liveStats = withPointStats(liveStatsMap.get(member.room.room_id) || emptyLiveStats, point)
    const above = idx > 0 ? all[idx - 1] : null
    const below = idx < all.length - 1 ? all[idx + 1] : null
    const comparison = snapshotContext.comparisonRankingMap.get(member.room.room_id)
    const comparisonRank = comparison ? toNum(comparison.rank) : null
    const comparisonPoint = comparison ? toNum(comparison.point) : null
    const isZeroPointTie = comparisonPoint != null && point === 0 && comparisonPoint === 0

    return {
      ...member,
      point,
      gap_above: above ? Math.max(0, toNum(above.point) - point) : null,
      gap_below: below ? Math.max(0, point - toNum(below.point)) : null,
      trend: {
        rank_diff: isZeroPointTie
          ? 0
          : comparisonRank != null ? comparisonRank - currentRank : null,
        point_diff: comparisonPoint != null ? point - comparisonPoint : null,
      },
      live: liveStats,
      room: enrichRoom(member.room, memberMap.get(member.room.room_id)),
    }
  })

  const summaryAccumulator = {
    ranked_members: rankings.length,
    active_members: 0,
    total_points: 0,
    total_lives: 0,
    total_gift: 0,
    total_comments: 0,
    total_duration: 0,
    total_active_days: 0,
    total_viewer_peak: 0,
    max_viewer_peak: 0,
  }

  for (const row of rankings) {
    summaryAccumulator.total_points += toNum(row.point)
    summaryAccumulator.total_lives += toNum(row.live.live_count)
    summaryAccumulator.total_gift += toNum(row.live.total_gift)
    summaryAccumulator.total_comments += toNum(row.live.total_comments)
    summaryAccumulator.total_duration += toNum(row.live.total_duration)
    summaryAccumulator.total_active_days += toNum(row.live.active_days)
    summaryAccumulator.total_viewer_peak += toNum(row.live.total_viewer_peak)
    summaryAccumulator.max_viewer_peak = Math.max(summaryAccumulator.max_viewer_peak, toNum(row.live.max_viewer_peak))
    if (toNum(row.live.live_count) > 0) summaryAccumulator.active_members++
  }

  const summary = {
    ...summaryAccumulator,
    avg_points_per_live: summaryAccumulator.total_lives > 0 ? Math.round(summaryAccumulator.total_points / summaryAccumulator.total_lives) : 0,
    avg_gift_per_live: summaryAccumulator.total_lives > 0 ? Math.round(summaryAccumulator.total_gift / summaryAccumulator.total_lives) : 0,
    avg_comments_per_live: summaryAccumulator.total_lives > 0 ? Math.round(summaryAccumulator.total_comments / summaryAccumulator.total_lives) : 0,
    avg_duration_per_live: summaryAccumulator.total_lives > 0 ? Math.round(summaryAccumulator.total_duration / summaryAccumulator.total_lives) : 0,
    avg_peak_viewers: summaryAccumulator.total_lives > 0 ? Math.round(summaryAccumulator.total_viewer_peak / summaryAccumulator.total_lives) : 0,
    total_live_hours: Number((summaryAccumulator.total_duration / 3600).toFixed(1)),
    active_ratio: summaryAccumulator.ranked_members > 0
      ? Number((summaryAccumulator.active_members / summaryAccumulator.ranked_members).toFixed(2))
      : 0,
    last_updated: generatedAt.toISOString(),
  }

  return {
    event: result.event,
    summary,
    date: generatedAt.toISOString(),
    snapshot: snapshotContext.snapshot,
    rankings,
  }
}

export async function scrapeAndStoreCompetitionRanking(now = new Date()): Promise<CompetitionRankingSnapshotResult> {
  const latestEvent = await getCompetition()
  const eventEndedAtMs = toNum(latestEvent?.event?.ended_at) * 1000
  const allowedUntilMs = eventEndedAtMs + (24 * 60 * 60 * 1000)
  const snapshotHour = getSnapshotHour(now)
  const scrapedAt = new Date()

  if (eventEndedAtMs > 0 && now.getTime() > allowedUntilMs) {
    return {
      event_id: EVENT_ID,
      snapshot_hour: snapshotHour,
      scraped_at: scrapedAt,
      upserted: false,
      matched_count: 0,
      modified_count: 0,
      skipped: true,
      reason: 'event-ended-more-than-1-day',
    }
  }

  const detail = await getCompetitionRankingDetails()
  const { startDate: eventStartDate, endDate: eventEndDate } = getEventWindow(detail.event)
  const ranking = (Array.isArray(detail.rankings) ? detail.rankings : []).map(toStoredRanking)
  const roomIds = Array.from(new Set(
    (Array.isArray(detail.rankings) ? detail.rankings : [])
      .map(row => toNum(row?.room?.room_id))
      .filter((roomId): roomId is number => Number.isFinite(roomId) && roomId > 0),
  ))

  const writeResult = await ShowroomCompetition.updateOne(
    {
      snapshot_hour: snapshotHour,
    },
    {
      $set: {
        event_id: EVENT_ID,
        snapshot_hour: snapshotHour,
        scraped_at: scrapedAt,
        event: detail.event,
        ranking,
      },
      $unset: {
        rankings: 1,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
      strict: false,
    },
  )

  for (const roomId of roomIds) {
    try {
      const topFans = await fetchCompetitionTopFansForRoom(roomId, EVENT_ID, eventStartDate, eventEndDate)
      await ShowroomCompetitionTopFans.updateOne(
        {
          event_id: EVENT_ID,
          room_id: roomId,
          snapshot_hour: snapshotHour,
        },
        {
          $set: {
            event_id: EVENT_ID,
            room_id: roomId,
            snapshot_hour: snapshotHour,
            scraped_at: scrapedAt,
            top_fans: topFans,
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
          strict: false,
        },
      )
    }
    catch (error) {
      console.error(`[competition] failed to scrape top fans snapshot room ${roomId}`, error)
    }
  }

  return {
    event_id: EVENT_ID,
    snapshot_hour: snapshotHour,
    scraped_at: scrapedAt,
    upserted: writeResult.upsertedCount > 0,
    matched_count: writeResult.matchedCount,
    modified_count: writeResult.modifiedCount,
  }
}
