import type { Context } from 'hono'
import { getIDNLives } from '../idn/lives'
import cache from '@/utils/cache'
import { createError } from '@/utils/errorResponse'

export async function getIDNLive(c: Context): Promise<IDNLives> {
  const lives = await cache.fetch('idnlivess', () => getIDNLives(), 10000)
  const username = c.req.param('id')
  const data = lives.find(i => i.user.username === username)
  if (!data) throw createError({ status: 404, message: 'Room not found!' })
  return data
}
