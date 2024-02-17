import type { Context } from 'hono'
import { getIDNLives } from '../idn/lives'
import cache from '@/utils/cache'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'
import IdolMember from '@/database/schema/48group/IdolMember'

const promises = new Map<string, Promise<IDNLivesDetail>>()
export async function getIDNLive(c: Context): Promise<IDNLivesDetail> {
  const username = c.req.param('id')
  let promise = promises.get(username)
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      fetch(c).then((r) => {
        resolve(r)
        promises.delete(username)
      }).catch(reject)
    })

    promises.set(username, promise)
  }
  return await promise
}

export async function fetch(c: Context): Promise<IDNLivesDetail> {
  const lives = await cache.fetch('idnlivess', () => getIDNLives(), 7000)
  const username = c.req.param('id')
  const roomData = await IdolMember.findOne({ 'idn.username': username }).populate<{ showroom: Database.IShowroomMember }>('showroom').catch(() => null)
  const data = lives.find(i => i.user.username === username)
  if (!roomData && !data) throw createError({ status: 404, message: 'Room not found!' })
  return {
    ...data,
    is_live: data != null,
    member_info: {
      name: roomData?.info?.nicknames?.[0] || roomData?.name,
      img: roomData?.info?.img || roomData?.showroom?.img,
      key: roomData?.showroom?.url,
      room_id: roomData?.showroom_id || roomData?.showroom?.room_id,
    },
  }
}
