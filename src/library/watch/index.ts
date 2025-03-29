import type { Context } from 'hono'
import { getSousenkyoMembers } from '../jkt48/scraper/sousenkyo'
import { getCommentLog, getGiftList, getGiftLog, getLiveInfo, getRoomStatus, getStreamingURL } from '@/utils/api/showroom'
import { createError } from '@/utils/errorResponse'
import IdolMember from '@/database/schema/48group/IdolMember'

interface WatchCache {
  data: Watch.WatchData
  is_error: false
}

interface WatchError {
  error: any
  is_premium: boolean
  is_error: true
}

export const cache = new Map<string, WatchCache | WatchError >()

function setClearCache(room_url_key: string) {
  setTimeout(() => {
    cache.delete(room_url_key)
  }, 9000)
}

export async function getWatchData(c: Context) {
  const room_url_key = c.req.param('id')
  const cacheData = cache.get(room_url_key)
  const data = cacheData || await queuedFetch(c)
  if (!cacheData) {
    setClearCache(room_url_key)
    cache.set(room_url_key, data)
  }

  if (!data.is_error) {
    if (data.data.premium_room_type !== 0) throw createError({ status: 404, message: 'Live is premium!' })
    return data.data
  }
  else {
    throw data.error
  }
}

const promises = new Map<string, Promise<WatchCache | WatchError>>()
async function queuedFetch(c: Context): Promise<WatchCache | WatchError> {
  const id = c.req.param('id')
  if (!id) throw createError({ status: 400, message: 'Bad request!' })
  let promise = promises.get(id)
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      getData(c).then((r) => {
        resolve(r)
        promises.delete(id)
      }).catch(reject)
    })
    promises.set(id, promise)
  }
  return await promise
}

async function getData(c: Context): Promise<WatchCache | WatchError> {
  const room_url_key = c.req.param('id')
  const srId = c.get('user')?.sr_id // disabled because singleprocesses feature
  try {
    // const cookies = ``
    const cookies = `sr_id=${srId};`
    const data = await getRoomStatus({ room_url_key }, cookies)
    const liveInfo = data.is_live ? (await getLiveInfo({ room_id: data.room_id }, cookies)) : null
    const streamUrl = data.is_live ? (await getStreamingURL({ room_id: data.room_id }, cookies)).streaming_url_list : []
    // const streamUrl = data.is_live ? (await getLive({ room_id: data.room_id }, cookies)).streaming_url_list : []
    const comments = (data.is_live ? (await getCommentLog(data.room_id, cookies)).comment_log : []).filter(i => !(!Number.isNaN(i.comment) && Number.parseInt(i.comment) <= 50))
    const giftLog = (data.is_live ? (await getGiftLog(data.room_id, cookies)).gift_log : [])
    const giftList = (data.is_live ? (await getGiftList(data.room_id, cookies)).normal : [])
    const dataMember = await IdolMember.findOne({ showroom_id: data.room_id }).select({ jkt48id: true }).lean().catch(e => null)
    const jkt48id = dataMember?.jkt48id
    // const sousenkyoData = await getSousenkyoMembers()

    const watchData: Watch.WatchData = {
      name: data.room_name,
      started_at: data.started_at,
      can_comment: data.can_comment,
      live_id: data.live_id,
      room_id: data.room_id,
      streaming_url_list: streamUrl,
      socket_host: data.broadcast_host,
      socket_key: data.broadcast_key,
      socket_port: data.broadcast_port,
      room_url_key: data.room_url_key,
      image: data.image_s,
      is_live: data.is_live,
      gift_log: giftLog,
      gift_list: giftList,
      premium_room_type: liveInfo?.premium_room_type ?? 0,
      comments: comments.map((i) => {
        return <Watch.Comment>{
          id: i.user_id.toString() + i.created_at.toString(),
          user_id: i.user_id,
          name: i.name,
          comment: i.comment,
          created_at: i.created_at,
          avatar_id: i.avatar_id,
        }
      }),
      // sousenkyo: sousenkyoData?.find(i => jkt48id?.includes(i.id)),
    }

    const res: WatchCache = {
      data: watchData,
      is_error: false,
    }
    return res
  }
  catch (e) {
    const is_premium = (e as any)?.data?.errors?.[0]?.redirect_url != null
    const data: WatchError = {
      error: is_premium ? createError({ status: 404, message: 'Live is premium!' }) : e,
      is_error: true,
      is_premium,
    }
    return data
  }
}
