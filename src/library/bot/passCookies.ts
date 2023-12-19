import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import Config from '@/database/schema/config/Config'

export async function passCookie(c: Context) {
  const body = await c.req.parseBody()
  console.log(body.cookies)
  console.log(body.pass)
  console.log(body.user_agent)
  console.log(c.req.header('user-agent'))
  if (body.pass === process.env.PASS && body.cookies) {
    try {
      await Config.updateOne(
        {
          configname: 'cookies_jkt48',
        },
        {
          $set: {
            configname: 'cookies_jkt48',
            value: body.cookies,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )

      await Config.updateOne(
        {
          configname: 'useragent_jkt48',
        },
        {
          $set: {
            configname: 'useragent_jkt48',
            value: body.user_agent || c.req.header('user-agent'),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )
      return true
    }
    catch (e) {
      console.log(e)
    }
  }

  throw createError({ status: 404, message: 'Endpoint not found!' })
}
