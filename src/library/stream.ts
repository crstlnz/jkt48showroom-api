import type { Context } from 'hono'
import { $fetch } from 'ofetch'
import { createError } from '@/utils/errorResponse'

export default async function getStream(c: Context) {
  const url = c.req.query('url')
  if (!url?.includes('playback.live-video.net') && !url?.includes('live.showroom-live.com')) throw createError({ status: 400, message: 'Bad request!' })
  return await $fetch(url, {
    onResponse(ctx) {
      const headers = [{
        key: 'Content-Type',
        value: 'application/vnd.apple.mpegurl',
      }, {
        key: 'Content-Length',
        value: ctx.response.headers.get('content-length') ?? '',
      }]
      c.set('custom_headers', JSON.stringify(headers))
      for (const header of headers) {
        c.header(header.key, header.value)
      }
    },
  })
}
