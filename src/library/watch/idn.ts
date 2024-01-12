import type { Context } from 'hono'
import { getIDNLives } from '../idn/lives'
import cache from '@/utils/cache'
import Member from '@/database/schema/48group/Member'
import { createError } from '@/utils/errorResponse'

export async function getIDNLive(c: Context): Promise<IDNLivesDetail> {
  const lives = await cache.fetch('idnlivess', () => getIDNLives(), 7000)
  const username = c.req.param('id')
  const roomData = await Member.findOne({ idn_username: username }).populate<{ showroom: Database.IShowroomMember }>('showroom')
  const data = lives.find(i => i.user.username === username)
  if (!roomData && !data) throw createError({ status: 404, message: 'Room not found!' })
  return {
    ...data,
    is_live: data != null,
    member_info: {
      name: roomData?.nicknames[0] || roomData?.name,
      img: roomData?.img || roomData?.showroom?.img,
      key: roomData?.showroom?.url,
      room_id: roomData?.showroom_id || roomData?.showroom?.room_id,
    },
  }
}
