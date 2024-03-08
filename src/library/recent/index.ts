import Fuse from 'fuse.js'
import ShowroomLog from '@schema/showroom/ShowroomLog'
import type { Context } from 'hono'
import config from '@/config'
import { getMembers } from '@/library/member'
import LiveLog from '@/database/live/schema/LiveLog'

export async function getRecents(c: Context): Promise<IApiRecents> {
  const qq = c.req.query()
  let type: string | undefined = qq.type || 'showroom'
  if (type === 'all') type = undefined

  let page = 1
  const maxPerpage = 30
  const perpage = Math.min(Number(qq?.perpage || 10), maxPerpage)
  const query: RecentsQuery = qq ?? {}
  if (query.page) page = Number(query.page) ?? 1
  if (page < 1) page = 1
  const sort: SortType = config.isSort(query.sort) ? query.sort : 'date'
  const order = Number.parseInt((query.order ?? '-1') as string) || -1
  function getSort(sort: SortType): string {
    return `${order < 0 ? '-' : ''}${(() => {
        switch (sort) {
          case 'date':
            return 'live_info.date.end'
          case 'gift':
            return 'c_gift'
          case 'views':
            return 'live_info.viewers.peak'
          case 'duration':
            return 'live_info.duration'
          default:
            return 'live_info.date.end'
        }
      })()}`
  }

  let logs = [] as any[]
  let total = 0
  let members = []

  interface Options {
    room_id?: number[] | number
    is_dev?: boolean
    'live_info.viewers.peak'?: object
    'live_info.date.end'?: object
    type?: string
  }

  const options: Options = {}
  if (type) options.type = type
  if (process.env.NODE_ENV !== 'development') options.is_dev = false
  if (query.room_id) {
    options.room_id = query.room_id
  }
  else {
    const search = query.search ? String(query.search) ?? '' : ''
    members = await getMembers(c)
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
        options['live_info.date.end'] = {
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

  if (members.length || query.room_id) {
    logs = await LiveLog.find(options)
      .select({
        custom: 1,
        idn: 1,
        live_info: {
          duration: 1,
          viewers: {
            peak: 1,
            is_excitement: 1,
          },
          date: 1,
        },
        data_id: 1,
        total_gifts: 1,
        created_at: 1,
        room_id: 1,
        gift_rate: 1,
        room_info: 1,
        type: 1,
      })
      .sort(getSort(sort))
      .skip((page - 1) * perpage)
      .limit(perpage)
      .populate({
        path: 'room_info',
        select: '-_id name img url -room_id member_data img_square is_group',
        populate: {
          path: 'member_data',
          select: '-_id info.is_graduate info.img info.nicknames slug',
        },
      })
      .lean()

    total = await ShowroomLog.countDocuments(options)
  }

  return {
    recents: logs.map<IRecent>(i => ({
      _id: i._id,
      data_id: i.data_id,
      idn: i.idn,
      member: {
        name: i.room_info?.name ?? 'Member not Found!',
        nickname: i.custom ? (i.custom.title ?? i.custom.theater?.title) : i.room_info?.member_data?.info?.nicknames?.[0] || undefined,
        img_alt: i.custom?.img ?? i.room_info?.member_data?.info?.img ?? i.room_info?.img_square ?? i.room_info?.img ?? config.errorPicture,
        img: i.custom?.banner ?? i.custom?.img ?? i.room_info?.img ?? i.room_info?.member_data?.info?.img ?? config.errorPicture,
        url: i.room_info?.member_data?.slug ?? i.room_info?.url ?? '',
        is_graduate: i.room_info?.is_group ? false : (i.room_info?.member_data?.info?.is_graduate ?? i.room_id === 332503),
        is_official: i.room_info?.is_group ?? false,
      },
      created_at: i.created_at.toISOString(),
      live_info: {
        duration: i.live_info?.duration ?? 0,
        viewers: i.live_info?.viewers?.peak
          ? {
              num: i.live_info?.viewers?.peak ?? 0,
              is_excitement: i.live_info?.viewers?.is_excitement ?? false,
            }
          : undefined,
        date: {
          start: i.live_info.date.start.toISOString(),
          end: i.live_info.date.end.toISOString(),
        },
      },
      gift_rate: i.gift_rate,
      room_id: i.room_id,
      points: i.total_gifts || 0,
      type: i.type,
    })),
    page,
    perpage,
    total_count: total,
  }
}
