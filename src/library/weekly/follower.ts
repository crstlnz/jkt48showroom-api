import { randomUUID } from 'crypto'
import { ofetch } from 'ofetch'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import tz from 'dayjs/plugin/timezone'
import { sleep } from '@/utils'
import IdolMember from '@/database/schema/48group/IdolMember'

dayjs.extend(utc)
dayjs.extend(tz)

export interface IDNLiveFollowAPI {
  status: number
  message: string
  data: {
    name: string
    following_count: number
    follower_count: number
    is_follow: boolean
  }
  error: any
}

function getShowroomFollower(room_id: number): Promise<ShowroomAPI.RoomProfile> {
  return ofetch('https://www.showroom-live.com/api/room/profile', {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    },
    query: {
      room_id,
    },
  })
}

function getIDNFollower(uuid: string): Promise<IDNLiveFollowAPI> {
  return ofetch('https://mobile-api.idn.app/v3.1/profile/follow', {
    headers: {
      'x-api-key': '1ccc5bc4-8bb4-414c-b524-92d11a85a818',
      'x-request-id': randomUUID(),
      'User-Agent': 'Android/9/SM-S9260',
    },
    query: {
      uuid,
    },
  })
}

export interface FollowerScrapeData {
  name: string
  fetchId: string
  date: Date | string
  showroom: {
    id: number
    level: number
    follower: number
  }
  idn: {
    id: string
    follower: number
  }
}

async function scrapeAll(member: IdolMember, showroomData: ShowroomAPI.RoomProfile | null = null, idnData: IDNLiveFollowAPI | null = null, retry: number = 0) {
  const res = await Promise.allSettled<{ type: string, data: ShowroomAPI.RoomProfile | IDNLiveFollowAPI }>([
    async () => {
      return {
        type: 'showroom',
        data: showroomData || await getShowroomFollower(member.showroom_id ?? 0),
      }
    },
    async () => {
      return {
        type: 'idn',
        data: idnData || await getIDNFollower(String(member.idn?.id)),
      }
    },
  ].map(i => i()))

  let sr: ShowroomAPI.RoomProfile | null = null
  let idn: IDNLiveFollowAPI | null = null

  for (const r of res) {
    if (r.status === 'fulfilled') {
      if (r.value.type === 'showroom') {
        sr = r.value.data as ShowroomAPI.RoomProfile
      }
      else {
        idn = r.value.data as IDNLiveFollowAPI
      }
    }
  }

  if (!sr || !idn) {
    if (retry < 5) {
      await sleep(500)
      return await scrapeAll(member, sr, idn, retry + 1)
    }
    throw new Error('Failed to fetch data!')
  }

  return {
    member,
    showroom: sr,
    idn,
  }
}

export default async function scrapeFollower(): Promise<FollowerScrapeData[]> {
  const members = await IdolMember.find({ 'info.is_graduate': false, 'group': 'jkt48' })
  const promises = members.map(async (i) => {
    if (!i.idn?.id) {
      console.log(`${i.name} is missing idn live id!`)
    }
    if (!i.showroom_id || !i.idn?.id) return null
    const data = await scrapeAll(i)
    return {
      memberData: i,
      showroom: data.showroom,
      idn_follower: data.idn,
    }
  })

  const res = (await Promise.all(promises)).filter(i => i != null)

  return res.map((i) => {
    const date = dayjs().tz('Asia/Jakarta').startOf('day')
    return {
      name: i.memberData.name,
      fetchId: `${i.memberData.showroom_id}${date.format('DDMMYY')}`,
      date: date.toDate(),
      showroom: {
        id: i.memberData.showroom_id!,
        level: i.showroom.room_level,
        follower: i.showroom.follower_num,
      },
      idn: {
        id: i.memberData.idn!.id!,
        follower: i.idn_follower.data.follower_count,
      },
    }
  })
}
