import type { Context } from 'hono'
import { Hono } from 'hono'
import LiveLog from '@/database/live/schema/LiveLog'
import { useCORS } from '@/utils/cors'
import { handler } from '@/utils/factory'
import { checkToken } from '@/utils/security/token'

const app = new Hono()
app.use('*', checkToken(false))
app.use('*', useCORS('self'))

const MAX_PERPAGE = 50000
const DEFAULT_PERPAGE = 50000

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

app.get('/recent', ...handler(async (c: Context) => {
  const pageQuery = c.req.query('page') ?? '1'
  const page = Math.max(Number(pageQuery), 1)
  const perpage = Math.min(Math.max(Number(c.req.query('perpage') ?? DEFAULT_PERPAGE), DEFAULT_PERPAGE), MAX_PERPAGE)
  const includeImages = true
  const imageLimit = Math.min(Math.max(Number(c.req.query('image_limit') ?? 1), 1), 5)
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

  const query = LiveLog.find({ ...filter })
    .select(select)
    .sort({ 'live_info.date.end': -1 })
    .lean()

  console.log(select)
  if (pageQuery) {
    query.skip((page - 1) * perpage).limit(perpage)
    const data = await query.exec()

    return {
      urls: data.map(i => toRecentSitemapUrl(i, includeImages, imageLimit)),
      page,
      perpage,
    }
  }

  const urls = []
  const cursor = query.cursor({ batchSize: 5000 })
  for await (const data of cursor) {
    urls.push(toRecentSitemapUrl(data, includeImages, imageLimit))
  }
  return urls
}, { hours: 1, useSingleProcess: true }))

export default app
