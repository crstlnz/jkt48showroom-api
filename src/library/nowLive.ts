import type { Context } from 'hono'
import { getMembers } from './member'
import { getAllFollows, getIsLive, getOnlives, getRoomStatus, getStreamingURL } from '@/utils/showroomAPI'

let promise: Promise<INowLive[]> | null = null
export async function getNowLive(c: Context) {
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      getNowLiveCookies(null, c).then((r) => {
        resolve(r)
        promise = null
      }).catch(() => {
        console.log('ERROR change to backup')
        return getNowLiveIndirect(null, c).then((r) => {
          resolve(r)
          promise = null
        }).catch((e) => {
          promise = null
          reject(e)
        })
      })
    })
  }
  return await promise
}

async function getNowLiveDirect(
  membersData: IMember[] | null = null,
  c: Context,
): Promise<INowLive[]> {
  const members: IMember[] = membersData ?? await getMembers(c)
  const promises: Promise<INowLive | null>[] = []
  for (const member of members) {
    promises.push(
      (async (): Promise<INowLive | null> => {
        try {
          const data = await getIsLive(member.room_id)
          if (!data.ok) return null // if 'ok',this room is on live
          const status = await getRoomStatus({ room_url_key: member.url.startsWith('/') ? member.url.slice(1) : member.url })
          const streamURLS = await getStreamingURL({ room_id: member.room_id })
          return {
            name: member.name,
            img: member.img,
            img_alt: member.img_alt,
            url: member.url,
            room_id: member.room_id,
            is_graduate: member.is_graduate,
            is_group: member.is_group,
            room_exists: member.room_exists,
            started_at: (status.started_at ?? 0) * 1000,
            streaming_url_list: streamURLS.streaming_url_list ?? [],
          }
        }
        catch (e) {
          return null
        }
      })(),
    )
  }
  const data = await Promise.all(promises)
  return data.filter(i => i) as INowLive[]
}

// eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars
async function newOnlivesCookies() {
  // TODO
}

async function getNowLiveCookies(membersData: IMember[] | null = null, c: Context): Promise<INowLive[]> {
  const members: IMember[] = membersData ?? await getMembers(c)
  const rooms = await getAllFollows().catch(() => [])
  const roomMap = new Map<string, ShowroomAPI.RoomFollow>()
  const result: Promise<INowLive>[] = []
  const missing = []

  for (const room of rooms) {
    roomMap.set(room.room_id, room)
  }

  for (const member of members) {
    const room = roomMap.get(String(member.room_id))
    if (room) {
      if (room.is_online) {
        let isPremium = false
        result.push((async () => {
          const streamURLS = await getStreamingURL({ room_id: room.room_id }, process.env.SR_ID || '').catch((e) => {
            console.log(e)
            return {
              streaming_url_list: [],
            }
          })
          const RoomStatus = await getRoomStatus({ room_url_key: room.room_url_key }).catch((e: any) => {
            if (e.data?.errors && e.data?.errors[0]?.redirect_url) {
              isPremium = true
            }
          })
          return {
            name: room.room_name,
            img: room.image_l,
            img_alt: member.img_alt,
            url: room.room_url_key,
            room_id: Number(room.room_id),
            started_at: (RoomStatus?.started_at ?? 0) * 1000,
            is_graduate: member.is_graduate,
            is_group: member.is_group,
            room_exists: member.room_exists,
            streaming_url_list: streamURLS.streaming_url_list ?? [],
            is_premium: isPremium,
          }
        })())
      }
    }
    else if (member.room_exists) {
      missing.push(member)
    }
  }

  const lives = []
  lives.push(...await Promise.all(result))
  if (missing.length) {
    lives.push(...await getNowLiveDirect(missing, c))
  }
  return lives
}

export async function getNowLiveIndirect(membersData: IMember[] | null = null, c: Context): Promise<INowLive[]> {
  const members: IMember[] = membersData ?? await getMembers(c)
  const memberMap = new Map<string | number, IMember>()
  for (const member of members) {
    memberMap.set(member.room_id, member)
  }

  const res = await getOnlives()
  const all: ShowroomAPI.OnlivesRoom[] = res.onlives.reduce((a: any, b: any) => {
    a.push(...b.lives)
    return a
  }, [])

  const result: INowLive[] = []
  for (const room of all) {
    const member = memberMap.get(room.room_id)
    if (member) {
      result.push({
        name: room.main_name,
        img: room.image,
        img_alt: member.img_alt,
        url: room.room_url_key,
        room_id: room.room_id,
        started_at: (room.started_at ?? 0) * 1000,
        is_graduate: member.is_graduate,
        is_group: member.is_group,
        room_exists: member.room_exists,
        streaming_url_list: room.streaming_url_list ?? [],
      })
    }
  }

  return result
}
