import type { Context } from 'hono'
import { group } from 'node:console'
import dayjs from 'dayjs'
import { z } from 'zod'
import IdolMember from '@/database/schema/48group/IdolMember'
import { cachedJKT48VLive } from '@/library/jkt48v'
import { getOnlives } from '@/utils/api/showroom'
import singleflight from '@/utils/singleflight'
import { fetchIDN } from './idn/lives'
import { getNowLiveCookies, getNowLiveIndirect } from './nowLive'

export const YoutubeThumbnailZod = z.object({
  url: z.url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

// Karena struktur IStreamingURL tidak diberikan, buat fleksibel (terima field apa pun)
export const StreamingURLZod = z.object({}).passthrough()

/** ===== Core schemas ===== */

export const JKT48VLiveResultsZod = z.object({
  channelTitle: z.string(),
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnails: z.object({
    default: YoutubeThumbnailZod,
    medium: YoutubeThumbnailZod,
    high: YoutubeThumbnailZod,
  }),
  url: z.string(),
  etag: z.string(),
  group: z.string(),
}).strict()

export const YoutubeLiveZod = JKT48VLiveResultsZod.extend({
  type: z.literal('youtube'),
}).strict()

export const INowLiveZod = z.object({
  name: z.string(),
  img: z.string(),
  img_alt: z.string().optional(),
  url_key: z.string().optional(),
  slug: z.string().optional(),
  room_id: z.number().int(),
  is_graduate: z.boolean(),
  is_group: z.boolean(),
  started_at: z.union([z.string(), z.number()]),
  chat_room_id: z.string().optional(),
  streaming_url_list: z.array(StreamingURLZod),
  is_premium: z.boolean().optional(),
  group: z.string(),
  type: z.union([z.literal('idn'), z.literal('showroom')]),
}).strict()

// Discriminated union by "type"
export const CombinedLiveZod = z.discriminatedUnion('type', [
  YoutubeLiveZod,
  INowLiveZod,
])

/** ===== Inferred TS types (opsional) ===== */
export type JKT48VLiveResults = z.infer<typeof JKT48VLiveResultsZod>
export type YoutubeLive = z.infer<typeof YoutubeLiveZod>
export type INowLive = z.infer<typeof INowLiveZod>
export type CombinedLive = z.infer<typeof CombinedLiveZod>
export type CombinedLives = z.infer<typeof CombinedLiveZod[]>

export const CombinedLivesListZod = z.array(CombinedLiveZod)

export async function getCombinedNowLive(c: Context) {
  const group = c.req.query('group') === 'hinatazaka46' ? 'hinatazaka46' : 'jkt48'
  return await fetchCombined(group, c.req.query('debug') === 'true')
}

export async function showroomNowlive(group: string = 'jkt48', debug = false): Promise<INowLive[]> {
  let res = []
  try {
    res = await getNowLiveCookies(null, group)
  }
  catch (e) {
    console.error(e)
    res = await getNowLiveIndirect(null, group)
  }

  const isDebug = debug
  if (isDebug) {
    if (res.filter(i => !i.is_group).length) return res
    const data = await getOnlives()
    return [...res, ...(data?.onlives[0]?.lives ?? []).splice(0, 4).map<INowLive>((i) => {
      return {
        name: i.main_name ?? 'Test name',
        img: i.image ?? 'https://static.showroom-live.com/image/room/cover/ee38ccf437e220f7ce8149c1c8aac94d6dca66734334bdad84c94bf41e78d3e0_square_s.png?v=1670924861',
        url_key: i.room_url_key ?? '',
        room_id: i.room_id ?? 0,
        is_graduate: false,
        is_group: false,
        group: 'jkt48',
        type: 'showroom',
        streaming_url_list: (i.streaming_url_list ?? []).map((s) => {
          return {
            label: s.label,
            quality: s.quality,
            url: s.url,
          }
        }),
        started_at: dayjs(i.started_at * 1000).toISOString(),
      }
    })]
  }
  else {
    return res
  }
}

async function idnNowLive(debug: boolean = false): Promise<INowLive[]> {
  const idnLives = await fetchIDN(debug)
  const members = await IdolMember.find({ 'idn.username': idnLives.map(i => i.user?.username || 'empty') }).lean()
  return idnLives.map((i) => {
    const member = members.find(m => m.idn?.username === i.user?.username)
    return {
      name: member?.info?.nicknames?.[0] ?? i.user?.name,
      img: i.image,
      img_alt: i.user.avatar,
      url_key: i.user?.username,
      slug: i.slug,
      room_id: member?.showroom_id || 0,
      is_graduate: member?.info.is_graduate ?? false,
      is_group: member?.group === 'official',
      group: 'jkt48', // karna idn hanya jkt48
      chat_room_id: i.chat_room_id,
      started_at: i.live_at,
      streaming_url_list: [{
        label: 'original',
        quality: 1,
        url: i.stream_url,
      }],
      type: 'idn',
    }
  })
}

async function getJKT48V(_debug: boolean = false): Promise<YoutubeLive[]> {
  const lives = await cachedJKT48VLive()
  return lives.map((i) => {
    return {
      ...i,
      type: 'youtube',
    }
  })
}

export async function fetchCombined(group: string, debug = false): Promise<CombinedLive[]> {
  const sr = await showroomNowlive(group)
  const res: CombinedLive[] = [...sr]
  if (group === 'jkt48' || group === 'all') {
    const isDebug = debug
    const idn = await singleflight.do(`idnlives-${isDebug}`, async () => await idnNowLive(isDebug))
    const jkt48v = debug ? [] : await singleflight.do('jkt48v', async () => await getJKT48V().catch(() => [])).catch(() => [])
    res.push(...idn)
    res.push(...jkt48v)
  }
  return res
}
