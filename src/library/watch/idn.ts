import type { Context } from 'hono'
import { getIDNLives } from '../idn/lives'
import { getSousenkyoMembers } from '../jkt48/scraper/sousenkyo'
import cache from '@/utils/cache'
import { createError } from '@/utils/errorResponse'
import IdolMember from '@/database/schema/48group/IdolMember'

export async function getIDNLive(c: Context): Promise<IDNLivesDetail> {
  return await fetch(c)
}

export async function fetch(c: Context): Promise<IDNLivesDetail> {
  const lives = await cache.fetch('idnlivess', () => getIDNLives(), 7000)
  const username = c.req.param('id')
  const roomData = await IdolMember.findOne({ 'idn.username': username }).populate<{ showroom: Database.IShowroomMember }>('showroom').catch(() => null)
  const data = lives.find(i => i.user.username === username)
  if (!roomData && !data) throw createError({ status: 404, message: 'Room not found!' })
  // const sousenkyoData = await getSousenkyoMembers()
  return {
    ...data,
    is_live: data != null,
    member_info: {
      name: roomData?.info?.nicknames?.[0] || roomData?.name,
      img: roomData?.info?.img || roomData?.showroom?.img,
      key: roomData?.showroom?.url,
      room_id: roomData?.showroom_id || roomData?.showroom?.room_id,
    },
    // sousenkyo: sousenkyoData?.find(i => roomData?.jkt48id?.includes(i.id)),
  }
}
