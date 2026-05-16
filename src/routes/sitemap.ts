import type { Context } from 'hono'
import dayjs from 'dayjs'
import { Hono } from 'hono'
import { dbConnect } from '@/database'
import LiveLog from '@/database/live/schema/LiveLog'
import cache from '@/utils/cache'
import { useCORS } from '@/utils/cors'
import { checkToken } from '@/utils/security/token'

const app = new Hono()
app.use('*', checkToken(false))
app.use('*', useCORS('self'))

function isAbsoluteUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}

function getRecentSitemapImages(data: Partial<Log.Live>, limit: number) {
  const images = [
    (data as any).custom?.img,
    data.type === 'idn' ? data.idn?.image : undefined,
  ].filter(isAbsoluteUrl)

  return [...new Set(images)].slice(0, limit).map(loc => ({ loc }))
}

function toRecentSitemapUrl(data: Partial<Log.Live>, includeImages = true, imageLimit = 1) {
  const url = {
    loc: `/recent/${data.data_id}`,
    lastmod: data.live_info?.date?.end?.toISOString?.(),
  }

  if (!includeImages) return url

  const images = getRecentSitemapImages(data, imageLimit)
  return images.length ? { ...url, images } : url
}

const startYear = 2020
const recentSitemapRefreshMs = 1000 * 60 * 60
const historicalSitemapCacheMs = 1000 * 60 * 60 * 24 * 30
const defaultImageLimit = 1

declare global {
  // eslint-disable-next-line vars-on-top
  var _sitemapPrefetchInterval: Timer | undefined
  // eslint-disable-next-line vars-on-top
  var _sitemapPrefetchPromise: Promise<void> | undefined
}

function getCurrentYear() {
  return dayjs().year()
}

function getYearsUntilCurrent() {
  const currentYear = getCurrentYear()
  return Array.from({ length: currentYear - startYear + 1 }, (_, index) => startYear + index)
}

function getSitemapYear(value?: string | null) {
  const currentYear = getCurrentYear()
  const year = Number(value ?? currentYear)
  if (!Number.isFinite(year)) return currentYear
  return Math.min(Math.max(year, startYear), currentYear)
}

function getImageLimit(value?: string | null) {
  return Math.min(Math.max(Number(value ?? defaultImageLimit), 1), 5)
}

function getRecentSitemapCacheKey(year: number, imageLimit = defaultImageLimit) {
  return `sitemap:recent:${year}:image_limit:${imageLimit}`
}

function getRecentSitemapCacheMs(year: number) {
  return year === getCurrentYear() ? recentSitemapRefreshMs : historicalSitemapCacheMs
}

export async function buildRecentSitemap(year: number, imageLimit = defaultImageLimit) {
  const includeImages = true
  const filter = process.env.NODE_ENV === 'development' ? {} : { is_dev: false }
  const select = {
    '_id': 0,
    'data_id': 1,
    'live_info.date.end': 1,
    ...(includeImages
      ? {
          'custom.banner': 1,
          'custom.img': 1,
          'idn.image': 1,
          'type': 1,
        }
      : {}),
  }
  const yearStart = dayjs().startOf('year').set('year', year)

  await dbConnect('liveDB')

  const query = LiveLog.find({
    ...filter,
    'live_info.date.end': {
      $gte: yearStart.toDate(),
      $lte: yearStart.add(1, 'year').toDate(),
    },
  })
    .select(select)
    .sort({ 'live_info.date.end': -1 })
    .lean()

  const urls = []
  const cursor = query.cursor({ batchSize: 5000 })
  for await (const data of cursor) {
    urls.push(toRecentSitemapUrl(data, includeImages, imageLimit))
  }
  return urls
}

async function refreshRecentSitemapYear(year: number) {
  const imageLimit = defaultImageLimit
  const urls = await buildRecentSitemap(year, imageLimit)
  await cache.set(getRecentSitemapCacheKey(year, imageLimit), urls, getRecentSitemapCacheMs(year))
}

async function refreshRecentSitemapYearsInOrder(years: number[]) {
  for (const year of years) {
    try {
      console.log(`[Sitemap] Caching recent sitemap ${year}`)
      await refreshRecentSitemapYear(year)
      console.log(`[Sitemap] Cached recent sitemap ${year}`)
    }
    catch (error) {
      console.error(`[Sitemap] Failed to cache recent sitemap ${year}`, error)
    }
  }
}

function queueRecentSitemapRefresh(years: number[]) {
  const previousRefresh = globalThis._sitemapPrefetchPromise ?? Promise.resolve()
  const nextRefresh = previousRefresh
    .catch(() => undefined)
    .then(() => refreshRecentSitemapYearsInOrder(years))

  globalThis._sitemapPrefetchPromise = nextRefresh.finally(() => {
    if (globalThis._sitemapPrefetchPromise === nextRefresh) {
      globalThis._sitemapPrefetchPromise = undefined
    }
  })

  return globalThis._sitemapPrefetchPromise
}

export function startRecentSitemapPrefetch() {
  if (process.env.NODE_ENV === 'development') return
  if (globalThis._sitemapPrefetchInterval) return

  queueRecentSitemapRefresh(getYearsUntilCurrent()).catch(error => console.error('[Sitemap] Prefetch failed', error))

  globalThis._sitemapPrefetchInterval = setInterval(() => {
    queueRecentSitemapRefresh([getCurrentYear()]).catch(error => console.error('[Sitemap] Refresh failed', error))
  }, recentSitemapRefreshMs)
}

app.get('/recent', async (c: Context) => {
  const year = getSitemapYear(c.req.query('year'))
  const imageLimit = getImageLimit(c.req.query('image_limit'))
  const cacheKey = getRecentSitemapCacheKey(year, imageLimit)

  if (process.env.NODE_ENV !== 'development') {
    const cachedUrls = await cache.get(cacheKey)
    if (cachedUrls) return c.json(cachedUrls)
  }

  const urls = await buildRecentSitemap(year, imageLimit)
  if (process.env.NODE_ENV !== 'development') {
    await cache.set(cacheKey, urls, getRecentSitemapCacheMs(year))
  }

  return c.json(urls)
})

export default app
