import type { Hono } from 'hono'
import { useCache } from '@/utils/useCache'

export function cacheSettings(app: Hono) {
  app.get('/recent', useCache())
  // app.get('/recent/:id', useCache())
  app.get('/recent/:id/gifts', useCache())
  app.get('/member/:id', useCache(7200000))

  app.get('/now_live', useCache(10000))
  app.get('/next_live', useCache(14400000))
  app.get('/first_data', useCache(3600000 * 24))

  app.get('/screenshots/*', useCache(3600000 * 24))
  app.get('/records', useCache(600000))

  app.get('/next_schedule', useCache(600000))

  app.get('/theater/*', useCache(86400000))

  app.get('/news/*', useCache(86400000))

  app.get('/birthday', useCache(86400000))

  app.get('/48/member', useCache(7200000))

  // app.get('/member', useCache()) // member endpoint use internal cache
  // app.get('/birthday', useCache()) // birthday endpoint use internal cache
}
