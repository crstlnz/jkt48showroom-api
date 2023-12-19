import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import showroom from './showroom'
import auth from './auth'
import user from './user'
import admin from './admin'
import { getRecents } from '@/library/recent'
import { getRecentDetails } from '@/library/recent/details'
import { dbConnect } from '@/database'
import { getMembers } from '@/library/member'
import { getMemberDetails } from '@/library/member/profile'
import { getStats } from '@/library/stats'
import { getGifts } from '@/library/recent/gifts'
import { getNowLive } from '@/library/nowLive'
import { getNextLive } from '@/library/nextLive'
import { getFirstData } from '@/library/firstData'
import { getScreenshots } from '@/library/screenshots'
import { getRecords } from '@/library/records'
import { getTheaterDetail } from '@/library/jkt48/theater/details'
import { getNewsDetail } from '@/library/jkt48/news/details'
import { getNews } from '@/library/jkt48/news'
import { getSchedule } from '@/library/jkt48/nextSchedule'
import { getMemberBirthdays } from '@/library/stage48/birthday'
import { getMember48List } from '@/library/stage48/memberList'
import { generateCSRF, useCSRF, useSessionID } from '@/utils/security'
import { getStageList } from '@/library/recent/stageList'
import { getProfile } from '@/library/room/profile'
import { useShowroomSession } from '@/utils/showroomSession'
import { handler } from '@/utils/factory'
import { useCORS } from '@/utils/cors'
import { getIDNLives } from '@/library/idn/lives'
import { getIDNLive } from '@/library/watch/idn'
import { getWatchData } from '@/library/watch'

const app = new Hono()

if (process.env.NODE_ENV === 'development') {
  app.use('*', logger())
}

// CSRF //
app.post('*', useCSRF())
app.delete('*', useCSRF())
app.put('*', useCSRF())
// CSRF //

app.use('*', useSessionID())

app.get('/csrf_token', useCORS('self'), async (c) => {
  const token = generateCSRF(c)
  return c.json({
    csrf_token: token,
  })
})

app.route('/admin', admin)
app.route('/auth', auth)
app.route('/user', user)
app.route('/showroom', showroom)

app.use('*', useCORS('all'))

app.use('/*', async (c, next) => {
  await dbConnect(2)
  await next()
})

/// already use cache
app.get('/stats', ...handler(c => getStats(c.req.query())))
///
app.get('/idn_lives', ...handler(getIDNLives, { seconds: 10 }))
app.get('/recent', ...handler(getRecents))
app.get('/recent/:id', ...handler(getRecentDetails, { hours: 1 }))
app.get('/recent/:data_id/gifts', ...handler(getGifts, { hours: 1 }))
app.get('/recent/:data_id/stagelist', ...handler(getStageList, { hours: 1 }))
app.get('/member', ...handler(getMembers, { hours: 12 }))
app.get('/member/:id', ...handler(c => getMemberDetails(c.req.param('id')), { minutes: 30 }))
app.get('/now_live', ...handler(getNowLive, { seconds: 10 }))
app.get('/next_live', ...handler(getNextLive, { hours: 1 }))
app.get('/watch/:id', ...handler(getWatchData, { seconds: 10 }))
app.get('/watch/:id/idn', ...handler(getIDNLive, { seconds: 10 }))
app.get('/first_data', ...handler(getFirstData, { days: 1 }))
app.get('/screenshots/:id', ...handler(getScreenshots, { hours: 12 }))
app.get('/records', ...handler(getRecords, { hours: 2 }))
app.get('/next_schedule', ...handler(getSchedule, { minutes: 1 }))
app.get('/theater/:id', ...handler(getTheaterDetail, { minutes: 30 }))
app.get('/news', ...handler(getNews))
app.get('/news/:id', ...handler(c => getNewsDetail(c.req.param('id')), { days: 1 }))
app.get('/birthday', ...handler(getMemberBirthdays)) // this already have cache
app.get('/48/member', ...handler(getMember48List, { days: 1 }))
app.get('/profile', useShowroomSession(), ...handler(getProfile))

export default app
