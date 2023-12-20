import type { Context } from 'hono'
import ipc from 'node-ipc'
import { createError } from '@/utils/errorResponse'
import Config from '@/database/schema/config/Config'

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
      pingDiscordBot()
      return true
    }
    catch (e) {
      console.log(e)
    }
  }

  throw createError({ status: 404, message: 'Endpoint not found!' })
}

export function pingDiscordBot() {
  const botId = 'discord-bot'
  ipc.config.id = 'api'
  ipc.config.retry = 1500
  ipc.config.silent = true
  ipc.connectTo(botId, () => {
    ipc.of[botId].on('connect', () => {
      ipc.of[botId].emit('fetch-jkt48', 'The message we send')
      ipc.disconnect(botId)
    })
  })
}
