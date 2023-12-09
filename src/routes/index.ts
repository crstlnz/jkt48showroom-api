import type { Context } from 'hono'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import showroom from './showroom'
import { cacheSettings } from './cacheSettings'
import auth from './auth'
import user from './user'
import { getRecents } from '@/library/recent'
import { getRecentDetails } from '@/library/recent/details'
import { dbConnect } from '@/database'
import { getMembers } from '@/library/member'
import { getMemberDetails } from '@/library/member/profile'
import { getStats } from '@/library/stats'
import { getGifts } from '@/library/recent/gifts'
import { getNowLive } from '@/library/nowLive'
import { getNextLive } from '@/library/nextLive'
import { getWatchData } from '@/library/watch'
import { getFirstData } from '@/library/firstData'
import { getScreenshots } from '@/library/screenshots'
import { getRecords } from '@/library/records'
import { getTheaterDetail } from '@/library/jkt48/theater/details'
import { getNewsDetail } from '@/library/jkt48/news/details'
import { getNews } from '@/library/jkt48/news'
import { getSchedule } from '@/library/jkt48/nextSchedule'
import { getMemberBirthdays } from '@/library/stage48/birthday'
import { getMember48List } from '@/library/stage48/memberList'
import { generateCSRF } from '@/utils/security'
import { getStageList } from '@/library/recent/stageList'
import { checkToken } from '@/utils/security/token'

const app = new Hono()

// app.use('/*', async (c, next) => {
//   await calculationTime(next, c.req.path)
// })
if (process.env.NODE_ENV === 'development') {
  app.use('*', logger())
}

app.use('*', cors({
  origin: 'http://192.168.2.2:3000',
  credentials: true,
}))

app.use('*', checkToken(false))
// app.use('*', useShowroomSession())

app.route('/auth', auth)
app.route('/user', user)

app.route('/showroom', showroom)

app.use('/*', async (c, next) => {
  await dbConnect(2)
  await next()
})

cacheSettings(app)
/// already use cache
app.get('/stats', async c => c.json(await getStats(c.req.query())))
///

app.get('/recent', async c => c.json(await getRecents(c.req.query())))
app.get('/recent/:id', async c => c.json(await getRecentDetails(c.req.param('id'))))
app.get('/recent/:id/gifts', async c => c.json(await getGifts(c.req.param('id'), c.req.query('s'), Number(c.req.query('page') || 1))))
app.get('/recent/:id/stagelist', async c => c.json(await getStageList(c.req.param('id'))))
// app.get('/member', async c => useCache(c, () => getMembers(c.req.query('group'))))
app.get('/member', async c => c.json(await getMembers(c.req.query('group'))))
app.get('/member/:id', async c => c.json(await getMemberDetails(c.req.param('id'))))

app.get('/now_live', async c => c.json(await getNowLive(c.req.query())))
app.get('/next_live', async c => c.json(await getNextLive(c.req.query())))

app.get('/watch/:id', async (c: Context) => c.json(await getWatchData({ room_url_key: c.req.param('id') }, `sr_id=${c.get('user')?.sr_id}`)))
app.get('/first_data', async c => c.json(await getFirstData(c.req.query())))

app.get('/screenshots/:id', async c => c.json(await getScreenshots(c.req.param('id'))))

app.get('/records', async c => c.json(await getRecords(c.req.query())))

app.get('/next_schedule', async c => c.json(await getSchedule()))

app.get('/theater/:id', async c => c.json(await getTheaterDetail(c.req.param('id'))))

app.get('/news', async c => c.json(await getNews(c.req.query())))
app.get('/news/:id', async c => c.json(await getNewsDetail(c.req.param('id'))))

app.get('/birthday', async c => c.json(await getMemberBirthdays(c.req.query())))

app.get('/48/member', async c => c.json(await getMember48List(c.req.query('group'))))

app.get('/csrf_token', async (c) => {
  const token = generateCSRF(c)
  // let sr_id = ''
  // const sess = await ofetch(`${process.env.SHOWROOM_API}/api/csrf_token`, {
  //   onResponse({ response }) {
  //     const cookies = parseCookieString(response.headers.get('Set-Cookie') || '')
  //     sr_id = cookies.sr_id?.value
  //   },
  // })
  // const encrypted = encrypt(sr_id)
  // console.log('ENCRYPTED', encrypted)
  // console.log('DECRYPTED', decrypt(encrypted))
  return c.json({
    csrf_token: token,
    // sr_id: encrypt(sr_id),
    // showroom_csrf: sess.csrf_token,
  })
})

app.get('/test_cookie', async (c: Context) => {
  // await setSignedCookie(c, '_kokijarantas', 'astaw', process.env.COOKIE_SECRET, {
  //   httpOnly: true,
  // })
  console.log(c.get('showroom_session'))
  return c.json({
    test: 'ahay',
  })
})
export default app
