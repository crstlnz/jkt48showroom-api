import type { Context } from 'hono'
import Setlist from '@/database/showroomDB/jkt48/Setlist'
import { uploadImageBuffer } from '@/utils/cloudinary'
import { createError } from '@/utils/errorResponse'

export async function addOrEditSetlist(c: Context) {
  const data = await c.req.parseBody()
  const dataId = data._id
  const poster = data.poster as File
  const banner = data.banner as File
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
      dataJson.banner = secure_url
    }

    const idObj: Record<string, string> = {}
    if (dataId) {
      idObj._id = String(dataId)
    }
    else {
      idObj.id = id
    }

    await Setlist.updateOne(
      {
        ...idObj,
      },
      {
        $set: dataJson,
      },
      {
        upsert: true,
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
    console.error(e)
    throw createError({ statusCode: 500, statusMessage: 'An error occured!' })
  }
}
