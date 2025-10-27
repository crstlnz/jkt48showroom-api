import type { Context } from 'hono'
import fs from 'fs'
import dayjs from 'dayjs'
import id from 'dayjs/locale/id'
import CustomParseFormat from 'dayjs/plugin/customParseFormat'
import Config from '@/database/schema/config/Config'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { createError } from '@/utils/errorResponse'

dayjs.extend(CustomParseFormat)
dayjs.locale({ ...id })

export async function inputShowroomLog(c: Context): Promise<{ data_id: string, status: number }> {
  const fields = await c.req.parseBody()
  try {
    if (
      !fields.roomId
      || !fields.liveId
      || !fields.comments
      || !fields.commentsBy
      || !fields.excitement
      || !fields.penontonAktif
      || !fields.dateStart
      || !fields.dateEnd
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Some fields are empty!',
      })
    }
    if (!fields.gifts || (fields.gifts as any).size === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File not included!',
      })
    }
    if ((fields.gifts as any).mimetype !== 'application/json') {
      throw createError({
        statusCode: 400,
        statusMessage: 'File must be JSON!',
      })
    }
    const filePath = (fields.gifts as any).filepath
    const rawJSON = fs.readFileSync(filePath) as any
    fs.unlinkSync(filePath)
    const data = JSON.parse(rawJSON)
    if ('isFree' in data[0] && 'senders' in data[0]) {
      const paid = data.filter(
        (i: { isFree: boolean }) => i.isFree === false,
      )
      const free = data
        .filter((i: { isFree: boolean }) => i.isFree === true)
        .map((i: any) => {
          return {
            gift_id: i.giftId,
            point: i.giftPoints,
            num: i.totalQty,
            users: i.senders.length,
          }
        })

      const userGifts = new Map()

      for (const gift of paid) {
        for (const user of gift.senders) {
          if (userGifts.has(user.userId)) {
            const userGift = userGifts.get(user.userId)
            userGift.total += gift.giftPoints * user.qty
            userGift.gifts.push({
              gift_id: gift.giftId,
              num: user.qty,
              date: user.timestamp,
            })
          }
          else {
            userGifts.set(user.userId, {
              total: gift.giftPoints * user.qty,
              user_id: user.userId,
              name: user.name,
              avatar_id: user.avatarId,
              gifts: [
                {
                  gift_id: gift.giftId,
                  num: user.qty,
                  date: user.timestamp,
                },
              ],
            })
          }
        }
      }

      const gift_id_map = new Map()
      for (const gg of data) gift_id_map.set(gg.giftId, gg.giftId)
      const startDate = dayjs(fields.dateStart as unknown as string, 'D MMMM YYYY hh:mm:ss WIB').toDate()
      const endDate = dayjs(fields.dateEnd as unknown as string, 'D MMMM YYYY hh:mm:ss WIB').toDate()

      const jpnRate = (await Config.findOne({ configname: 'japan_rate' }).lean())?.value ?? 106.74
      const dataId = `${Math.floor(startDate.getTime() / 1000)}${fields.roomId}`
      const result = {
        jpn_rate: jpnRate,
        created_at: endDate,
        live_id: fields.liveId,
        data_id: dataId,
        room_id: fields.roomId,
        total_point: Array.from(userGifts.values()).reduce(
          (a, b) => a + b.total,
          0,
        ),
        live_info: {
          duration: endDate.getTime() - startDate.getTime(),
          comments: {
            num: fields.comments,
            users: fields.commentsBy,
          },
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          viewers: {
            peak: fields.excitement,
            last: fields.excitement,
            is_excitement: true,
            active: fields.penontonAktif,
          },
        },
        record_dates: [
          {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
          },
        ],
        gift_data: {
          free_gifts: free,
          gift_id_list: [...gift_id_map.values()],
          gift_log: Array.from(userGifts.values()).map((i) => {
            return {
              total: i.total,
              user_id: i.user_id,
              gifts: i.gifts,
            }
          }),
        },
        users: Array.from(userGifts.values()).map((i) => {
          return {
            user_id: i.user_id,
            avatar_id: i.avatar_id,
            name: i.name,
          }
        }),
      }

      await ShowroomLog.updateOne(
        { data_id: dataId },
        {
          $set: {
            ...result,
            __v: 148,
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )

      return {
        data_id: dataId,
        status: 200,
      }
    }
    else {
      throw createError({ statusCode: 400, statusMessage: 'Data is wrong!' })
    }
  }
  catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Something error!',
    })
  }
}
