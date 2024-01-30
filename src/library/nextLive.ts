import { getNextLive as fetchNextLive, getAllFollows } from '@utils/showroomAPI'
import type { Context } from 'hono'
import { getMembers } from './member'

/// 318247 is umega room
export async function getNextLive(c: Context): Promise<INextLive[]> {
  return (await getFromCookies(null, c)).filter(i => i.room_id !== 318247)
}

async function getFromCookies(membersData: IMember[] | null = null, c: Context): Promise<INextLive[]> {
  const members: IMember[] = membersData ?? await getMembers(c)
  const rooms = await getAllFollows().catch(() => [])
  const roomMap = new Map<string, ShowroomAPI.RoomFollow>()
  const result: INextLive[] = []
  const missing = []

  for (const room of rooms) {
    roomMap.set(room.room_id, room)
  }

  for (const member of members) {
    const room = roomMap.get(String(member.room_id))
    const now = new Date()
    if (room) {
      if (room.has_next_live) {
        const raw = new Date(room.next_live)
        const date = new Date(`${room.next_live} ${now.getFullYear() + ((now.getMonth() < raw.getMonth() || now.getDate() <= raw.getDate()) ? 0 : 1)}`)
        result.push({
          name: room.room_name,
          img: room.image_l,
          img_alt: member.img_alt,
          url: room.room_url_key,
          room_id: Number(room.room_id),
          is_graduate: member.is_graduate,
          is_group: member.is_group,
          room_exists: member.room_exists,
          date: date.toISOString(),
        })
      }
    }
    else if (member.room_exists) {
      missing.push(member)
    }
  }

  const lives = []
  lives.push(...result)
  if (missing.length) {
    lives.push(...await getDirectNextLive(missing, c))
  }
  return lives
}

async function getDirectNextLive(membersData: IMember[] | null = null, c: Context): Promise<INextLive[]> {
  try {
    const members: IMember[] = (membersData ?? (await getMembers(c))).filter(i => i.room_exists)
    const promises: Promise<INextLive | null>[] = []
    for (const member of members) {
      promises.push(
        (async (): Promise<INextLive | null> => {
          try {
            const data = await fetchNextLive(member.room_id)
            if (!data.epoch) return null
            return {
              img: member.img,
              url: member.url,
              name: member.name,
              room_id: member.room_id,
              is_graduate: member.is_graduate,
              is_group: member.is_group,
              room_exists: member.room_exists,
              date: new Date(new Date(data.epoch * 1000).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).toISOString(),
            }
          }
          catch (e) {
            return null
          }
        })(),
      )
    }
    let data: INextLive[] = (await Promise.all(promises)).filter(i => i) as INextLive[]
    data = data.filter(i => new Date(i.date).getTime() - new Date().getTime() > 0)
    return data
  }
  catch (e) {
    return []
  }
}
