import type { Context } from 'hono'
import type { Banner } from '@/database/schema/config/Banner'
import { ZodError } from 'zod'
import { GroupBannerModel, GroupBannersZod } from '@/database/schema/config/Banner'

export async function updateBanner(c: Context) {
  const body = await c.req.json()
  try {
    const banners = GroupBannersZod.parse(body)
    for (const banner of banners) {
      await GroupBannerModel.updateOne({ group: banner.group }, { $set: banner }, { upsert: true })
    }
    return {
      status: 200,
      message: 'Oke',
    }
  }
  catch (e) {
    if (e instanceof ZodError) {
      const formatted = e.issues
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      return {
        status: 400,
        message: formatted,
      }
    }
    else {
      return {
        status: 400,
        message: 'An error occured!',
      }
    }
  }
  // for (const banner of banners) {
  //   await GroupBannerModel.updateOne({ group: banner.group }, { $set: { ...banner } }).lean()
  // }
}

export async function getBanner() {
  try {
    const data = await GroupBannerModel.find().lean()
    const res: Record<string, Banner[]> = {}
    for (const d of data) {
      res[d.group] = d.banners
    }
    return res
  }
  catch (e) {
    console.error(e)
    return {}
  }
}
