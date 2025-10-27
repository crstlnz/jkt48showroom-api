import Fuse from 'fuse.js'
import config from '@/config'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { StageList } from '@/database/showroomDB/StageList'
import { createError } from '@/utils/errorResponse'
import { getMembers } from '../member'

export async function getUserHistory(qq: any = null, userId: string): Promise<IHistoryRecents> {
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  let page = 1
  const group = config.getGroup(qq.group)
  const maxPerpage = 30
  const perpage = Math.min(qq.perpage || 10, maxPerpage)
  const query: RecentsQuery = qq ?? {}
  if (query.page) page = Number(query.page) ?? 1
  if (page < 1) page = 1
  const sort: SortType = config.isSort(query.sort) ? query.sort : 'date'
  const order = Number.parseInt((query.order ?? '-1') as string) || -1
  function getSort(sort: SortType): string {
    return `${order < 0 ? '-' : ''}${(() => {
      switch (sort) {
        case 'date':
          return 'live_info.end_date'
        case 'gift':
          return 'total_point'
        case 'views':
          return 'live_info.viewers.peak'
        case 'duration':
          return 'live_info.duration'
        default:
          return 'live_info.end_date'
      }
    })()}`
  }

  let logs = [] as any[]
  let total = 0
  let members = []

  interface Options {
    'users.user_id': string | string[]
    'room_id'?: number[] | number
    'is_dev'?: boolean
    'live_info.viewers.peak'?: object
    'live_info.end_date'?: object
  }

  const options: Options = {
    'users.user_id': userId,
  }
  if (process.env.NODE_ENV !== 'development') options.is_dev = false
  if (query.room_id) {
    options.room_id = query.room_id
  }
  else {
    const search = query.search ? String(query.search) ?? '' : ''
    members = await getMembers(group)
    if (search !== '') {
      const fuse = new Fuse(members, {
        threshold: 0.2,
        keys: [
          { name: 'name', weight: 0.3 },
          { name: 'nicknames', weight: 0.3 },
          { name: 'description', weight: 0.1 },
        ],
      })
      members = fuse.search(search).map(i => i.item)
    }

    const q = query.filter
    if (q === 'graduated' || q === 'active') {
      members = members.filter((i) => {
        return i.is_graduate === (q === 'graduated')
      })
    }

    if (members?.length) options.room_id = members.map(i => i.room_id).filter((i): i is number => i != null)

    if (query.date) {
      try {
        const date = JSON.parse(String(query.date))
        options['live_info.end_date'] = {
          $gte: new Date(Number(date.start)).toISOString(),
          $lte: new Date(Number(date.end)).toISOString(),
        }
      }
      catch (e) {
        console.log(e)
      }
    }
  }

  if (sort === 'views') {
    options['live_info.viewers.peak'] = {
      $ne: 0,
    }
  }

  // TODO
  if (members.length || query.room_id) {
    logs = await ShowroomLog.find(options as any)
      .select({
        custom: 1,
        live_info: {
          stage_list: 1,
          duration: 1,
          viewers: {
            peak: 1,
            is_excitement: 1,
          },
          start_date: 1,
          end_date: 1,
        },
        gift_data: {
          gift_log: 1,
        },
        data_id: 1,
        total_point: 1,
        created_at: 1,
        room_id: 1,
        users: 1,
        room_info: 1,
      })
      .sort(getSort(sort))
      .skip((page - 1) * perpage)
      .limit(perpage)
      .populate({
        path: 'room_info',
        select: '-_id name img url -room_id member_data img_square is_group',
        populate: {
          path: 'member_data',
          select: '-_id info.is_graduate info.img info.nicknames',
        },
      })
      .lean()

    total = await ShowroomLog.countDocuments(options as any)
  }

  const stageListAll = await StageList.find({ data_id: logs.map(i => i.data_id) })
  const stageListMap = new Map<string, Database.IStageListItem>()
  for (const stageList of stageListAll) {
    stageListMap.set(stageList.data_id, stageList)
  }

  return {
    recents: logs.map<IRecent & { type: HistoryType, user?: Database.UserData & { giftSpent: number } }>((i: any) => {
      let type: HistoryType = 'top100'
      const stageList = stageListMap.get(i.data_id)

      const rank = (stageList?.stage_list ?? []).reduce((a: any, b: any) => {
        // eslint-disable-next-line eqeqeq
        const r = b.list.findIndex((x: any) => x == userId) + 1
        if (r > 0) {
          return Math.min(r, a)
        }
        return a
      }, 101)

      if (rank <= 13) {
        type = 'top13'
      }
      else if (rank <= 50) {
        type = 'top50'
      }
      else if (rank > 100) {
        type = 'gifter'
      }

      const user = i.users.find((usr: any) => String(usr.user_id) === String(userId)) || undefined
      const giftSpent = i.gift_data.gift_log.find((usr: any) => String(usr.user_id) === String(userId))

      return {
        _id: i._id,
        type,
        user: {
          ...user,
          giftSpent: giftSpent?.total ?? 0,
        },
        data_id: i.data_id,
        member: {
          name: i.room_info?.name ?? 'Member not Found!',
          nickname: i.custom ? (i.custom.title ?? i.custom.theater?.title) : i.room_info?.member_data?.info?.nicknames[0] || undefined,
          img_alt: i.custom?.img ?? i.room_info?.member_data?.info?.img ?? i.room_info?.img_square ?? i.room_info?.img ?? config.errorPicture,
          img: i.custom?.img ?? i.room_info?.img ?? config.errorPicture,
          url: i.room_info?.url ?? '',
          is_graduate: i.room_info?.is_group ? false : (i.room_info?.member_data?.info?.is_graduate ?? i.room_id === 332503),
          is_official: i.room_info?.is_group ?? false,
        },
        created_at: i.created_at.toISOString(),
        live_info: {
          comments: i.live_info?.comments ?? undefined,
          duration: i.live_info?.duration ?? 0,
          viewers: i.live_info?.viewers?.peak
            ? {
                num: i.live_info?.viewers?.peak ?? 0,
                is_excitement: i.live_info?.viewers?.is_excitement ?? false,
              }
            : undefined,
          date: {
            start: i.live_info.start_date.toISOString(),
            end: i.live_info.end_date.toISOString(),
          },
        },
        room_id: i.room_id,
        points: i.total_point,
      }
    }),
    page,
    perpage,
    total_count: total,
  }
}
