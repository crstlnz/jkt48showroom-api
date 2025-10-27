import type { Context } from 'hono'
import Config from '@/database/schema/config/Config'
import { createError } from '@/utils/errorResponse'
import { fetchNewsJKT48, fetchScheduleJKT48 } from '../jkt48/scraper'

export async function passCookie(c: Context) {
  const body = await c.req.parseBody()
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
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )
      fetchJKT48()
      return true
    }
    catch (e) {
      console.log(e)
    }
  }

  throw createError({ status: 404, message: 'Endpoint not found!' })
}

let delay = false
export async function fetchJKT48() {
  if (!delay) {
    delay = true
    setTimeout(() => {
      delay = false
    }, 10000)

    console.log('Fetching JKT48 Schedule data...')
    await fetchScheduleJKT48().then(() => console.log('Fetch Schedule JKT48 Success!')).catch((_) => {
      console.log('Fetch Schedule JKT48 Failed')
    })

    console.log('Fetching JKT48 News data...')
    await fetchNewsJKT48().then(() => console.log('Fetch News JKT48 Success!')).catch((_) => {
      console.log('Fetch News JKT48 Failed')
    })
  }
}
