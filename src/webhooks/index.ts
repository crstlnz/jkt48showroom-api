import { Buffer } from 'buffer'
import crypto from 'crypto'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { Saweria } from '@/database/live/schema/Saweria'
import { createError } from '@/utils/errorResponse'

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
    const success = crypto.timingSafeEqual(Buffer.from(hmac) as any, Buffer.from(String(signature)) as any)
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
