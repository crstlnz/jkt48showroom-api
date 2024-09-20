// import cache from '@utils/cache'
// import { getMembers } from './member'
// import { calculateRanks } from './calculateRanks'
// import { getDateRange } from '@/utils'
// import { createError } from '@/utils/errorResponse'
// import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
// import { StageList } from '@/database/showroomDB/StageList'
// import config from '@/config'

import dayjs from 'dayjs'
import LiveLog from '@/database/live/schema/LiveLog'
import Theater from '@/database/showroomDB/jkt48/Theater'
import Stats from '@/database/live/schema/Stats'
import { createError } from '@/utils/errorResponse'
import { getMembers } from '@/library/member'
import IdolMember from '@/database/schema/48group/IdolMember'

// const time = 43200000 // 12 hours

// function isIDateRangeType(value: string): value is Stats.IDateRangeType {
//   return ['weekly', 'monthly', 'quarterly'].includes(value)
// }

// function isIDateRangeMemberType(value: string): value is Stats.IDateRangeMemberType {
//   return ['weekly', 'monthly', 'all'].includes(value)
// }

// interface StatsOptions {
//   group?: string
//   room_id?: number
//   type?: string
// }

// export async function getStats(query: StatsOptions | null = null) {
//   const group = config.getGroup(query?.group as string)
//   try {
//     if (query?.room_id) {
//       const type = isIDateRangeMemberType(query.type as string) ? query.type : undefined
//       return await getMemberStats(type as Stats.IDateRangeMemberType, query.room_id as number)
//     }
//     else {
//       const type = query?.type && isIDateRangeType(query.type) ? query.type : undefined
//       return await getAllMemberStats(type as Stats.IDateRangeType, group)
//     }
//   }
//   catch (e) {
//     console.error(e)
//     throw e
//   }
// }

// export async function getMemberStats(type: Stats.IDateRangeMemberType = 'all', roomId: number): Promise<Stats.IShowroomMemberStats> {
//   const dateRange = type === 'all' ? null : getDateRange(type)
//   const cacheString = `${roomId}-${type}`
//   const data = await cache.fetch<Stats.IShowroomMemberStats>(cacheString, () => fetchData(type, null, roomId), time)
//   if (data?.date?.to === dateRange?.to) return data
//   return await fetchData(type, null, roomId)
// }

// export async function getAllMemberStats(type: Stats.IDateRangeType = 'quarterly', group: string | null = null): Promise<Stats.IShowroomStats> {
//   const dateRange = getDateRange(type)
//   const cacheString = (group == null) ? type : `${group}-${type}`
//   const data = await cache.fetch<Stats.IShowroomStats>(cacheString, () => fetchData(type, group, null), time)
//   if (data?.date?.to === dateRange.to) return data
//   return await fetchData(type, group, null)
// }

// export async function fetchData(type: Stats.IDateRangeType, group: string | null, roomId: number | null): Promise<Stats.IShowroomStats>
// export async function fetchData(type: Stats.IDateRangeMemberType, group: string | null, roomId: number | null): Promise<Stats.IShowroomMemberStats>
// export async function fetchData(type: Stats.IDateRangeType | Stats.IDateRangeMemberType, group: string | null = null, roomId: number | null = null): Promise<Stats.IShowroomStats | Stats.IShowroomMemberStats> {
//   const dateRange = (roomId)
//     ? null
//     : {
//         from: getDateRange('quarterly').from,
//         to: getDateRange('weekly').to,
//       } // get all data and then convert it to monthly and weekly

//   let members: IMember[] = []
//   if (!roomId) {
//     members = await getMembers(group || '')
//     if (!members?.length) {
//       throw createError({
//         statusCode: 500,
//         statusMessage: 'Failed to fetch data!',
//       })
//     }
//   }

//   const select = {
//     room_info: 1,
//     total_point: 1,
//     created_at: 1,
//     users: 1,
//     live_info: {
//       start_date: 1,
//       end_date: 1,
//       viewers: {
//         peak: 1,
//       },
//     },
//     data_id: 1,
//     room_id: 1,
//   }

//   const option: Stats.StatsOptions = {
//     room_id: roomId || members.map(i => i.room_id),

//   }

//   if (dateRange) {
//     option['live_info.end_date'] = {
//       $gte: dateRange.from,
//       $lte: dateRange.to,
//     }
//   }

//   if (process.env.NODE_ENV !== 'development') option.is_dev = false
//   const logs = await ShowroomLog.find(option, select)
//     .lean()
//     .populate({
//       path: 'room_info',
//       select: '-_id name img url -room_id member_data',
//       populate: {
//         path: 'member_data',
//         select: '-_id isGraduate img',
//       },
//     }) as unknown as Database.IShowroomLog[]

//   const stageListData = await StageList.find({
//     data_id: logs.map(i => i.data_id),
//   })

//   if (roomId) {
//     const weekly = generate(logs, stageListData, 'weekly', 'member')
//     const monthly = generate(logs, stageListData, 'monthly', 'member')
//     const all = generate(logs, stageListData, 'all', 'member')
//     cache.set(`${roomId}-${weekly.type}`, weekly)
//     cache.set(`${roomId}-${monthly.type}`, monthly)
//     cache.set(`${roomId}-${all.type}`, all)
//     if (type === 'all') {
//       return all
//     }
//     else if (type === 'monthly') {
//       return monthly
//     }
//     else {
//       return weekly
//     }
//   }
//   else {
//     const weekly = generate(logs, stageListData, 'weekly', 'all')
//     const monthly = generate(logs, stageListData, 'monthly', 'all')
//     const quarterly = generate(logs, stageListData, 'quarterly', 'all')
//     cache.set(group ? `${group}-${weekly.type}` : weekly.type, weekly)
//     cache.set(group ? `${group}-${monthly.type}` : monthly.type, monthly)
//     cache.set(group ? `${group}-${quarterly.type}` : quarterly.type, quarterly)
//     if (type === 'quarterly') {
//       return quarterly
//     }
//     else if (type === 'monthly') {
//       return monthly
//     }
//     else {
//       return weekly
//     }
//   }
// }

// function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeType, typeStats: 'member' | 'all'): Stats.IShowroomStats | Stats.IShowroomMemberStats
// function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeMemberType, typeStats: 'member' | 'all'): Stats.IShowroomMemberStats
// function generate(logs: Database.IShowroomLog[], stageListData: Database.IStageListItem[], type: Stats.IDateRangeType | Stats.IDateRangeMemberType, typeStats: 'member' | 'all'): Stats.IShowroomStats | Stats.IShowroomMemberStats {
//   const dateRange = type === 'all' ? null : getDateRange(type)
//   let log = logs
//   if (dateRange) {
//     log = logs.filter(i => new Date(i.live_info.start_date).getTime() >= new Date(dateRange.from).getTime() && new Date(i.live_info.start_date).getTime() <= new Date(dateRange.to).getTime())
//   }

//   const filteredStageList = log.length > 0 ? stageListData.filter(i => log.some(z => z.data_id === i.data_id)) : []

//   const all = calculateRanks(log, filteredStageList)
//   const memberList = all.member.map((i) => {
//     return {
//       ...i,
//       live_point: i.total_viewer / i.live_count + i.point / 100,
//       avg_viewer: Math.floor(i.total_viewer / i.live_count),
//     }
//   })
//   const statsLive: Stats.IStats[] = [
//     {
//       title: 'Live Count',
//       key: 'livecount',
//       value: all.member.reduce((a, b) => a + b?.live_count ?? 0, 0),
//     },
//   ]
//   if (memberList.length) {
//     if (typeStats === 'all') {
//       const mostViews = memberList.sort((a, b) => b.most_viewer - a.most_viewer)[0]
//       const mostLive = memberList.sort((a, b) => b.live_count - a.live_count)[0]
//       const topMember = memberList.sort((a, b) => b.live_point - a.live_point)[0]
//       statsLive.push(
//         ...[
//           {
//             title: 'Most Live',
//             key: 'mostlive',
//             img: {
//               title: mostLive.name,
//               src: mostLive.img,
//             },
//             value: `${mostLive.live_count} ${mostLive.live_count > 1 ? 'Lives' : 'Live'}`,
//           },
//           {
//             title: 'Top Member',
//             key: 'topmember',
//             img: {
//               title: topMember.name,
//               src: topMember.img,
//             },
//             value: topMember.name,
//           },
//         ],
//       )

//       statsLive.push({
//         title: 'Most Viewer',
//         key: 'mostviewer',
//         img: {
//           title: mostViews.name,
//           src: mostViews.img,
//         },
//         value: mostViews.most_viewer,
//         parseType: 'viewer',
//       })
//     }
//     else {
//       statsLive.push({
//         title: 'Most Gifts',
//         key: 'mostgifts',
//         value: memberList[0].most_point,
//         parseType: 'gift',
//       })

//       statsLive.push({
//         title: 'Most Viewer',
//         key: 'mostviewer',
//         value:
//             memberList[0].most_viewer > 1000
//               ? `${(memberList[0].most_viewer / 1000).toFixed(2)}K Viewers`
//               : `${memberList[0].most_viewer} ${memberList[0].most_viewer > 1 ? 'Viewers' : 'Viewer'}`,
//       })
//       statsLive.push({
//         title: 'Longest Live',
//         key: 'longestlive',
//         value: memberList[0].duration,
//         parseType: 'duration',
//       })
//     }
//   }

//   return {
//     type,
//     ranks: all,
//     stats: statsLive,
//     date: !dateRange
//       ? {
//           from: '',
//           to: getDateRange('weekly').to,
//         }
//       : {
//           from: dateRange?.from ?? '',
//           to: dateRange?.to ?? '',
//         }
//     ,
//   }
// }

export async function stats() {
  throw new Error('Not implemented!')
  // const res = await Stats.findOne({ id: 'monthly' })
  // if (!res) throw createError({ status: 404, message: 'Not found!' })
  // return res
}

async function save(id: string, data: any) {
  try {
    // await Stats.updateOne(
    //   { id },
    //   {
    //     $set: {
    //       ...data,
    //       id,
    //     },
    //   },
    //   {
    //     upsert: true,
    //     setDefaultsOnInsert: true,
    //     runValidators: true,
    //   },
    // )
    // console.log('Finish')
  }
  catch (e) {
    console.error(e)
  }
}

export async function generateMonthly() {
  console.log('Generating stats...')
  const data = await getMonthly()
  await save('monthly', data)
  await save(data.id, data)
  console.log('Finishing...')
}

export async function getMonthly(date?: string | number | Date | dayjs.Dayjs | null | undefined) {
  const month = dayjs(date).subtract(1, 'month').startOf('month')
  // const filePath = '../../data-1bulan.json'
  // const exists = fs.existsSync(filePath)
  const dateRange = {
    $gte: month.toDate(),
    $lte: month.endOf('month').toDate(),
  }
  const membersList = await getMembers('jkt48')
  const data: Log.Live[] = await LiveLog.find({
    'is_dev': false,
    'live_info.date.start': dateRange,
    'room_id': membersList.map(i => i.room_id),
  }).populate({
    path: 'room_info',
    select: '_id name img url room_id member_data',
    populate: {
      path: 'member_data',
      select: '-_id name img nicknames jkt48id',
    },
  }).lean()
  console.log(data.length)
  // if (exists) {
  //   console.log('EXISTS')
  //   const raw = fs.readFileSync(filePath)
  //   const decoder = new TextDecoder('utf-8')
  //   data = JSON.parse(decoder.decode(raw))
  // }
  // else {
  // data = await LiveLog.find({
  //   'is_dev': false,
  //   'live_info.date.start': dateRange,
  // }).lean()
  //   fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8')
  // }
  const members = new Map()
  const Rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  })

  const fansMap = new Map()

  for (const d of data) {
    for (const fans of d.gift_data.gift_log) {
      const f = fansMap.get(fans.user_id)
      const fansInfo = d.users?.find(i => i.user_id === fans.user_id)
      if (f) {
        f.total_gift += fans.total * d.gift_rate
        f.total_live += 1

        if (fansInfo?.name) f.name = fansInfo.name
        if (fansInfo?.avatar_url) f.avatar_url = fansInfo.avatar_url
        if (fansInfo?.avatar_id) f.avatar_id = fansInfo.avatar_id
      }
      else {
        fansMap.set(fans.user_id, {
          total_gift: fans.total * d.gift_rate,
          user_id: fans.user_id,
          name: fansInfo?.name,
          avatar_url: fansInfo?.avatar_url,
          avatar_id: fansInfo?.avatar_id,
          total_live: 1,
        })
      }
    }

    const member = members.get(d.room_id)
    if (member) {
      // member.total_live += 1
      member.total_gift += d.c_gift
      member.history.push(d)

      member.longest_live = Math.max(dayjs(d.live_info?.date?.start).diff(dayjs(d.live_info?.date?.end), 'milliseconds'), member.longest_live)
    }
    else {
      // const memberInfo = await Showroom.findOne({ room_id: d.room_id }).lean()
      members.set(d.room_id, {
        // total_live: 1,
        total_gift: d.c_gift,
        history: [d],
        longest_live: dayjs(d.live_info?.date?.end).diff(dayjs(d.live_info?.date?.start), 'milliseconds'),
        member_data: {
          id: d.room_info?.room_id,
          is_graduate: d.room_info?.member_data?.info?.is_graduate ?? false,
          name: d.room_info?.member_data?.info?.nicknames?.[0] || d.room_info?.member_data?.name || d.room_info?.name || '',
          img: d.room_info?.img || '',
          img_alt: d.room_info?.member_data?.info?.img || '',
        },
      })
    }
  }

  const memberStats = [...members.values()].map((i) => {
    const history = (i.history || []) as Log.Live[]
    const lives = [...history.sort((a, b) => new Date(a.live_info?.date?.start).getTime() - new Date(b.live_info?.date?.start).getTime()) as Log.Live[]]
    // calculate live streak (live tiap hari tanpa putus)
    let lastLive: dayjs.Dayjs | null = null
    let longestStreak = 0
    let streak = 0
    let trimmedTotalLive = 0
    let trimmedIdn = 0
    let trimmedShowroom = 0
    for (const live of lives) {
      const currentDate = dayjs(live.live_info?.date?.start)
      if (lastLive) {
        const hourRange = currentDate.diff(lastLive, 'hour')
        if (hourRange >= 1) {
          trimmedTotalLive += 1
          if (live.type === 'idn') {
            trimmedIdn += 1
          }
          else {
            trimmedShowroom += 1
          }
        }

        const dateRange = currentDate.startOf('day').diff(lastLive.startOf('day'), 'day')
        if (dateRange === 1) {
          streak += 1
        }
        else if (dateRange > 1) {
          streak += 0
        }
      }
      else {
        trimmedTotalLive += 1
        streak += 1
        if (live.type === 'idn') {
          trimmedIdn += 1
        }
        else {
          trimmedShowroom += 1
        }
      }

      lastLive = currentDate
      longestStreak = Math.max(streak, longestStreak)
    }

    const last = lives.pop()
    return {
      ...i,
      live_info: {
        total: {
          all: history.length,
          idn: history.filter(i => i.type === 'idn')?.length,
          showroom: history.filter(i => i.type === 'showroom')?.length,
        },
        total_trimmed: {
          all: trimmedTotalLive,
          idn: trimmedIdn,
          showroom: trimmedShowroom,
        },
        avg_duration: Math.floor(history.reduce((a: number, b: Log.Live) => a + (b.live_info?.duration || 0), 0) / history.length),
      },
      live_streak: longestStreak,
      total_gift: Rupiah.format(i.total_gift),
      last_live: last
        ? {
            id: last.data_id,
            date: last.live_info?.date?.start,
          }
        : undefined,
      history: undefined,
    }
  })

  const theaterList = await Theater.find({
    date: dateRange,
  }).lean()

  for (const member of memberStats) {
    const memberData = await IdolMember.findOne({ _id: member.member_data?.member_data }).select({ jkt48id: 1 })
    let theaterCount = 0
    const ids = memberData?.jkt48id || []
    if (memberData?.jkt48id?.length) {
      theaterCount = theaterList.filter(i => ids.some(id => i.memberIds.map(a => String(a)).includes(String(id)))).length
    }
    member.theater_count = theaterCount
    // member.theater_count = 0
  }

  return {
    id: `monthly-${dayjs(dateRange.$gte).format('DDMMYY')}`,
    live_info: {
      total: {
        all: data.length,
        idn: data.filter(i => i.type === 'idn')?.length,
        showroom: data.filter(i => i.type === 'showroom')?.length,
      },
      total_trimmed: {
        all: memberStats.reduce((a, i) => a + i.live_info?.total_trimmed?.all, 0),
        idn: memberStats.reduce((a, i) => a + i.live_info?.total_trimmed?.idn, 0),
        showroom: memberStats.reduce((a, i) => a + i.live_info?.total_trimmed?.showroom, 0),
      },
    },
    top_gifter: [...fansMap.values()].sort((a, b) => b.total_gift - a.total_gift).slice(0, 50).map((i) => {
      return {
        ...i,
        gift_string: Rupiah.format(i.total_gift),
      }
    }),
    data: memberStats,
    date: {
      from: dateRange.$gte,
      to: dateRange.$lte,
    },
  }
}
