import type { Context } from 'hono'
import dayjs from 'dayjs'
import { getNowLiveCookies, getNowLiveIndirect } from './nowLive'
import { fetchIDN } from './idn/lives'
import IdolMember from '@/database/schema/48group/IdolMember'
import { getOnlives } from '@/utils/api/showroom'
import { cachedJKT48VLive, getJKT48VLive, JKT48VLiveResults } from '@/library/jkt48v'

// const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms))
// let id = 0
export async function getCombinedNowLive(c: Context) {
  const group = c.req.query('group') === 'hinatazaka46' ? 'hinatazaka46' : 'jkt48'
  return await fetchCombined(c, group)
}

async function showroomNowlive(c: Context): Promise<INowLive[]> {
  let res = []
  try {
    res = await getNowLiveCookies(null, c)
  }
  catch (e) {
    console.error(e)
    res = await getNowLiveIndirect(null, c)
  }

  const isDebug = c.req.query('debug') === 'true'
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

interface YoutubeLive extends JKT48VLiveResults {
  type : "youtube"
}

async function getJKT48V(debug: boolean = false): Promise<YoutubeLive[]> {
  const lives = await cachedJKT48VLive();
  return lives.map((i) => {
    return {
      ...i,
      type : "youtube"
    }
  })
}

async function fetchCombined(c: Context, group: string): Promise<(INowLive | YoutubeLive)[]> {
  const sr = await showroomNowlive(c)
  const res : (INowLive | YoutubeLive)[] = [...sr]
  if (group === 'jkt48') {
    const isDebug = c.req.query('debug')
    const idn = await idnNowLive(isDebug === 'true')
    const jkt48v = await getJKT48V().catch(()=> [])
    res.push(...idn)
    res.push(...jkt48v)
  }
  return res
}
