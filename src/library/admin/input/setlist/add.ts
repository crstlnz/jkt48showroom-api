import fs from 'fs'
import { Buffer } from 'buffer'
import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'
import { uploadImage, uploadImageBuffer } from '@/utils/cloudinary'
import Setlist from '@/database/showroomDB/jkt48/Setlist'

export async function addOrEditSetlist(c: Context) {
  const data = await c.req.parseBody()
  const poster = data.poster as File
  const banner = data.banner as File
  const origin_id = data.origin_id
  const id = String(data.id)
  const title = String(data.title)
  const title_alt = String(data.title_alt)
  const description = String(data.description)

  if (!id || !title) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })

  try {
    const dataJson: JKT48.Setlist = {
      id,
      title,
      title_alt,
      description,
    }

    if (poster) {
      const img = await uploadImageBuffer(await poster.arrayBuffer())
      const secure_url = img?.secure_url
      dataJson.poster = secure_url
    }

    if (banner) {
      const img = await uploadImageBuffer(await banner.arrayBuffer())
      const secure_url = img?.secure_url
      dataJson.poster = secure_url
    }

    await Setlist.updateOne(
      {
        id: origin_id ?? id,
      },
      {
        $set: dataJson,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    )

    return {
      code: 200,
      message: 'Success!',
    }
  }
  catch (e) {
    console.log(e)
    throw createError({ statusCode: 500, statusMessage: 'An error occured!' })
  }
}
