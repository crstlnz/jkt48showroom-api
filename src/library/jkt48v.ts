import { ofetch } from 'ofetch'
import { sleep } from '@/utils'

interface YoutubeThumbnail {
  url: string
  width: number
  height: number
}
export interface JKT48VLiveResults {
  channelTitle: string
  channelId: string
  title: string
  description: string
  thumbnails: {
    default: YoutubeThumbnail
    medium: YoutubeThumbnail
    high: YoutubeThumbnail
  }
  url: string
  etag: string
}

const jkt48v_ids = (process.env.JKT48V_YT_IDS ?? '').split(',').map(i => i.trim())
export async function getJKT48VLive() {
  try {
    const data = await searchYoutube()
    console.log(data)
    return data.filter(i => jkt48v_ids.includes(i.channelId))
  }
  catch (e) {
    console.error(e)
    throw new Error('Youtube search failed!')
  }
}

let keyI = 0
const keys = (process.env.YOUTUBE_KEY ?? '').split(',').map(i => i.trim())
function getYoutubeKey() {
  keyI++
  return keys[keyI % keys.length]
}

const cache = new Map<string, JKT48VLiveResults[]>()
let TO: NodeJS.Timeout
export async function cachedJKT48VLive(): Promise<JKT48VLiveResults[]> {
  const c = cache.get('cache')
  if (c) return c
  const res = await getJKT48VLive()
  cache.set('cache', res)
  clearTimeout(TO)
  TO = setTimeout(() => {
    cache.clear()
  }, 180000)
  return res
}

async function searchYoutube(result: JKT48VLiveResults[] = [], nextPageToken: string | null = null) {
  const data = await ofetch<YoutubeSearchResult>('https://www.googleapis.com/youtube/v3/search', {
    query: {
      part: 'snippet',
      eventType: 'live',
      type: 'video',
      key: getYoutubeKey(),
      q: '"jkt48v" | "jkt48"',
      pageToken: nextPageToken ?? undefined,
    },
  })

  result.push(...data.items.map((i) => {
    return {
      channelTitle: i.snippet?.channelTitle,
      channelId: i.snippet?.channelId,
      title: i.snippet?.channelTitle,
      description: i.snippet?.description,
      thumbnails: i.snippet?.thumbnails,
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      etag: i.etag,
    }
  }))

  if (data.nextPageToken != null) {
    await sleep(100)
    return searchYoutube(result, data.nextPageToken)
  }
  return result
}
