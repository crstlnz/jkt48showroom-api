import { ofetch } from 'ofetch'
import IdolMember from '@/database/schema/48group/IdolMember'

interface YoutubeThumbnail {
  url: string
  width: number
  height: number
}
interface JKT48VLiveResults {
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
  return (await searchYoutube()).filter(i => jkt48v_ids.includes(i.channelId))
}

async function searchYoutube(result: JKT48VLiveResults[] = [], nextPageToken: string | null = null) {
  const data = await ofetch<YoutubeSearchResult>('https://www.googleapis.com/youtube/v3/search', {
    query: {
      part: 'snippet',
      eventType: 'live',
      type: 'video',
      key: process.env.YOUTUBE_API ?? '',
      q: 'JKT48V',
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

  if (data.nextPageToken != null) return searchYoutube(result, data.nextPageToken)
  return result
}
