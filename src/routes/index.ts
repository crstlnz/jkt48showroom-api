import type { Context } from 'hono'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { csrf } from 'hono/csrf'
import showroom from './showroom'
import sousenkyo from './sousenkyo'
import auth from './auth'
import user from './user'
import admin from './admin'
import { getRecents } from '@/library/recent'
import { getRecentDetails } from '@/library/recent/details'
import { dbConnect } from '@/database'
import { getMembers } from '@/library/member'
import { getMemberDetails } from '@/library/member/profile'

// import { getStats } from '@/library/stats'
import { getGifts } from '@/library/recent/gifts'
import { getNextLive } from '@/library/nextLive'
import { getFirstData } from '@/library/firstData'
import { getScreenshots } from '@/library/screenshots'
import { getRecords } from '@/library/records'
import { getTheaterDetail } from '@/library/jkt48/theater/details'
import { getNewsDetail } from '@/library/jkt48/news/details'
import { getNews } from '@/library/jkt48/news'
import { getSchedule } from '@/library/jkt48/nextSchedule'
import { getMemberBirthdays, nextBirthDay } from '@/library/stage48/birthday'
import { getMember48List } from '@/library/stage48/memberList'
import { getIp, useSessionID } from '@/utils/security'
import { getStageList } from '@/library/recent/stageList'
import { getProfile } from '@/library/room/profile'
import { useShowroomSession } from '@/utils/showroomSession'
import { handler } from '@/utils/factory'
import { useCORS } from '@/utils/cors'
import { fetchIDN } from '@/library/idn/lives'
import { getIDNLive } from '@/library/watch/idn'
import { getWatchData } from '@/library/watch'
import { getSessId } from '@/utils/security/cookies/sessId'
import { getTheater } from '@/library/jkt48/theater'
import getEvents from '@/library/jkt48/event'
import { getCombinedNowLive } from '@/library/combinedNowLive'
import getStream from '@/library/stream'
import { getLeaderboard } from '@/library/leaderboard'
import { cachedJKT48VLive } from '@/library/jkt48v'
import getSetlist from '@/library/jkt48/theater/setlist'
import { getJKT48YoutubeVideo } from '@/library/jkt48tv'
import getWeekly from '@/library/weekly'
import { getEventList, getJKT48Event } from '@/library/jkt48/jkt48event'
import { getJKT48EventDetail } from '@/library/jkt48/jkt48event/details'

const app = new Hono()

app.use('*', useCORS('self'))

if (process.env.LOG === 'true') {
  app.use('*', logger())
}

const origins = (process.env.ORIGINS ?? '').split(',').map(i => i.trim())

app.get('/stream', useCORS('self'), ...handler(getStream, { seconds: 20, useJson: false, cacheClientOnly: true }))
app.get('/weekly', ...handler(getWeekly, { rateLimit: { limitTimeWindow: 60 * 1000 * 60, maxRequest: 200 } }))

// CSRF //
app.use('*', csrf({
  origin: origins,
}))

app.use('*', useSessionID())

app.route('/admin', admin)
app.route('/auth', auth)
app.route('/user', user)
app.route('/showroom', showroom)
app.route('/sousenkyo', sousenkyo)

app.get('/leaderboard', useCORS('self'), ...handler(getLeaderboard, { minutes: 10 }))

app.get('/jkt48_youtube', ...handler(getJKT48YoutubeVideo, { minutes: 30, useRateLimit: true, useSingleProcess: true }))
app.get('/jkt48v_live', ...handler(cachedJKT48VLive, { minutes: 5 }))
app.get('/member', ...handler(getMembers, { hours: 12 }))
app.get('/member/:id', ...handler(c => getMemberDetails(c.req.param('id')), { minutes: 30, useRateLimit: true }))

app.use('*', useCORS('all'))

app.use('/*', async (c, next) => {
  await dbConnect('all')
  await next()
})

app.get('/now_live', ...handler(getCombinedNowLive, (c) => {
  let group = c.req.query('group')
  const debug = c.req.query('debug')
  group = group === 'hinatazaka46' ? 'hinatazaka46' : 'jkt48'
  return {
    name: `${group}-nowlive${debug ?? ''}`,
    seconds: 30,
    rateLimit: {
      maxRequest: 24,
      limitTimeWindow: 1000 * 60 * 5,
    },
  }
}))

app.get('/next_live', ...handler(getNextLive, { hours: 1 }))
app.get('/watch/:id', ...handler(getWatchData, { seconds: 4 }))
app.get('/watch/:id/idn', ...handler(getIDNLive, { seconds: 13 }))
app.get('/first_data', ...handler(getFirstData, { days: 30 }))
app.get('/screenshots/:id', ...handler(getScreenshots, { hours: 12 }))
app.get('/records', ...handler(getRecords, { hours: 12 }))
app.get('/next_schedule', ...handler(getSchedule, { minutes: 15 }))
app.get('/event', ...handler(getEvents, { minutes: 5 }))
app.get('/theater', ...handler(getTheater, { minutes: 5 }))
app.get('/theater/:id', ...handler(getTheaterDetail, { minutes: 5 }))
app.get('/jkt48event', ...handler(getJKT48Event, { minutes: 5 }))
app.get('/jkt48event/:id', ...handler(getJKT48EventDetail, { minutes: 5 }))
app.get('/setlist', ...handler(getSetlist, { days: 1 }))
app.get('/news', ...handler(getNews, { minutes: 5 }))
app.get('/news/:id', ...handler(c => getNewsDetail(c.req.param('id')), { days: 1 }))
app.get('/birthday', ...handler(getMemberBirthdays, { hours: 1 }))
app.get('/48/member', ...handler(getMember48List, { days: 1 }))
app.get('/profile', useShowroomSession(), ...handler(getProfile, (c) => {
  const key = `${getSessId(c)}-profile-${c.req.query('room_id')}`
  return {
    name: key,
    hours: 1,
  }
}))

app.get('/next_birthday', ...handler(nextBirthDay, { minutes: 30 }))
app.get('/idn_lives', ...handler(() => fetchIDN(false), { seconds: 30, minutes: 1, useSingleProcess: true }))
// TODO fix pagination
app.get('/recent', ...handler(getRecents, { minutes: 4, useRateLimit: true }))
app.get('/recent/:id', ...handler(getRecentDetails, { hours: 1, useRateLimit: true }))
app.get('/recent/:data_id/gifts', ...handler(getGifts, { days: 1 }))
app.get('/recent/:data_id/stagelist', ...handler(getStageList, { days: 1 }))

app.get('/my_ip', (ctx: Context) => {
  return ctx.json({
    ip: getIp(ctx),
  })
})

export default app
