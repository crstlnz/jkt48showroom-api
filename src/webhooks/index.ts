import crypto from 'crypto'
import { Buffer } from 'buffer'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { createError } from '@/utils/errorResponse'
import { Saweria } from '@/database/live/schema/Saweria'

const app = new Hono()

const HEADER_NAME = 'Saweria-Callback-Signature'
const HMAC_PAYLOAD_KEYS = ['version', 'id', 'amount_raw', 'donator_name', 'donator_email'] as const
export function parsePayloadToHmacData(payload: any): string {
  return HMAC_PAYLOAD_KEYS.map(k => payload[k]).join('')
}

const verifySaweria = createMiddleware(async (c, next) => {
  const signature = c.req.header(HEADER_NAME)
  const hmac = crypto.createHmac('sha256', String(process.env.SAWERIA_KEY)).update(parsePayloadToHmacData(await c.req.json())).digest('hex')
  try {
    const success = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(String(signature)))
    if (!success) throw new Error('Unauthorized!')
    await next()
  }
  catch {
    throw createError({ status: 401, message: 'Unauthorized!' })
  }
})

app.post('/saweria', verifySaweria, async (c) => {
  const body = await c.req.json()
  try {
    await new Saweria(body).save()
  }
  catch (e) {
    console.log(e)
  }
  return await c.text('success')
})

export default app
