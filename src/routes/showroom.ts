import type { Context } from 'hono'
import { Hono } from 'hono'
import { ofetch } from 'ofetch'
import cache from '@utils/cache'
import { useShowroomSession } from '@utils/showroomSession'
import { checkToken } from '@/utils/security/token'

const showroomURL = process.env.SHOWROOM_API || ''
const app = new Hono()

async function showroomRequest(c: Context, url: string, ms = 60000, unique = false) {
  const query = c.req.query()
  const href = c.req.url
  const user = c.get('user')
  const res = await cache.fetch(`${href}${unique ? user?.id || 0 : ''}`, async () => {
    return await ofetch(`${showroomURL}${url}`, { params: query, headers: {
      Cookie: user?.sr_id ? `sr_id=${user.sr_id}` : '',
    } })
  }, ms)
  return c.json(res)
}

app.use('*', checkToken(false))
app.use('*', useShowroomSession())

app.get('/user/profile', async (c) => {
  return showroomRequest(c, '/api/user/profile', 60000, true)
})

app.get('/status', async (c) => {
  return showroomRequest(c, '/api/room/status')
})

app.get('/onlives', async (c) => {
  return showroomRequest(c, '/api/live/onlives')
})

app.get('/polling', async (c) => {
  return showroomRequest(c, '/api/live/polling')
})

app.get('/summary_ranking', async (c) => {
  return showroomRequest(c, '/api/live/summary_ranking')
})

app.get('/stage_user_list', async (c) => {
  return showroomRequest(c, '/api/live/stage_user_list')
})

app.get('/live_info', async (c) => {
  return showroomRequest(c, '/api/live/live_info')
})

app.get('/telop', async (c) => {
  return showroomRequest(c, '/api/live/telop')
})

app.get('/greeting', async (c) => {
  return showroomRequest(c, '/api/room/greeting', 1000, true)
})

app.get('/streaming_url', async (c) => {
  return showroomRequest(c, '/api/live/streaming_url')
})

app.get('/current_user', async (c) => {
  return showroomRequest(c, '/api/live/current_user', 60000 * 60, true)
})

app.get('/csrf_token', async (c) => {
  return showroomRequest(c, '/api/csrf_token', 10000, true)
})

app.get('/follow', async (c) => {
  return showroomRequest(c, '/api/follow/rooms', 1000, true)
})

export default app
