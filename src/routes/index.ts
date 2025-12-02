import type { Context } from 'hono'
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { logger } from 'hono/logger'
import { dbConnect } from '@/database'
import { getBanner } from '@/library/admin/banner'
import { fetchCombined } from '@/library/combinedNowLive'
import { getFirstData } from '@/library/firstData'
import { fetchIDN } from '@/library/idn/lives'
import getIDNUser from '@/library/idn/user'
import getEvents from '@/library/jkt48/event'
import { getJKT48Event } from '@/library/jkt48/jkt48event'
import { getJKT48EventDetail } from '@/library/jkt48/jkt48event/details'
import { getNews } from '@/library/jkt48/news'

import { getNewsDetail } from '@/library/jkt48/news/details'
import { getSchedule } from '@/library/jkt48/nextSchedule'
import { getTheater } from '@/library/jkt48/theater'
import { getTheaterDetail } from '@/library/jkt48/theater/details'
import getSetlist from '@/library/jkt48/theater/setlist'
import { getJKT48YoutubeVideo } from '@/library/jkt48tv'
import { cachedJKT48VLive } from '@/library/jkt48v'
import { getLeaderboard } from '@/library/leaderboard'
import { getMembers } from '@/library/member'
import { getMemberDetails } from '@/library/member/profile'
import { getNextLive } from '@/library/nextLive'
import { getRecents } from '@/library/recent'
import { getRecentDetails } from '@/library/recent/details'
// import { getStats } from '@/library/stats'
import { getGifts } from '@/library/recent/gifts'
import { getStageList } from '@/library/recent/stageList'
import { getRecords } from '@/library/records'
import { getProfile } from '@/library/room/profile'
import { getScreenshots } from '@/library/screenshots'
import { getMemberBirthdays, nextBirthDay } from '@/library/stage48/birthday'
import { getMember48List } from '@/library/stage48/memberList'
import getStream from '@/library/stream'
import { getWatchData } from '@/library/watch'
import { getIDNLive } from '@/library/watch/idn'
import getWeekly from '@/library/weekly'
import { cachedFetch } from '@/utils/cache/cachedFetch'
import { useCORS } from '@/utils/cors'
import { handler } from '@/utils/factory'
import { getIp, useSessionID } from '@/utils/security'
import { getSessId } from '@/utils/security/cookies/sessId'
import { useShowroomSession } from '@/utils/showroomSession'
import admin from './admin'
import auth from './auth'
import showroom from './showroom'
import sousenkyo from './sousenkyo'
import user from './user'
import { combinedLives } from './websocket'

const app = new Hono()

app.use('*', useCORS('self'))

function loggerPrint(message: string, ...rest: string[]) {
  if (process.env.SHOW_IP) {
    console.log(message, ...rest)
  }
}

if (process.env.LOG === 'true') {
  if (process.env.SHOW_IP) {
    app.use(async (c, next) => {
      await logger((...args) => loggerPrint(String(getIp(c)), ...args))(c, next)
    })
  }
  else {
    app.use('*', logger(loggerPrint))
  }
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

app.get('/banner', useCORS('self'), ...handler(getBanner, { minutes: 10 }))
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

app.get('/now_live', ...handler(async (c) => {
  const data = combinedLives()
  const debug = c.req.query('debug')
  const group = c.req.query('group')
  if (debug) {
    return await cachedFetch.fetch('combined-live', async () => {
      return await fetchCombined(group ?? 'all', true)
    }, 1000 * 60 * 5)
  }
  if (group === 'all') return data
  return data.filter(i => i.group === group)
}, (c) => {
  let group = c.req.query('group')
  const debug = c.req.query('debug')
  group = group === 'hinatazaka46' ? 'hinatazaka46' : 'jkt48'
  return {
    name: `${group}-nowlive${debug ?? ''}`,
    seconds: debug ? 1000 * 60 * 5 : 3,
    useSingleProcess: !!debug,
    rateLimit: debug
      ? {
          maxRequest: 40,
          limitTimeWindow: 1000 * 60 * 5,
        }
      : undefined,
  }
}))

app.get('/idn_user', ...handler(getIDNUser, { hours: 1 }))
app.get('/next_live', ...handler(getNextLive, { hours: 1 }))
app.get('/watch/:id', ...handler(getWatchData, { seconds: 4, useSingleProcess: true }))
app.get('/watch/:id/idn', ...handler(getIDNLive, { seconds: 13, useSingleProcess: true }))
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
