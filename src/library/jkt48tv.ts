import { ofetch } from 'ofetch'
import dayjs from 'dayjs'

const jkt48TVChannelId = 'UCadv-UfEyjjwOPcZHc2QvIQ'
const jkt48ChannelId = 'UCaIbbu5Xg3DpHsn_3Zw2m9w'
const profile = new Map()

interface YoutubeThumbnail {
  url: string
  width: number
  height: number
}

interface Statistics {
  viewCount: string
  likeCount: string
  favoriteCount: string
  commentCount: string
}

interface JKT48Video {
  id: string
  profilePict: {
    default: YoutubeThumbnail
    medium: YoutubeThumbnail
    high: YoutubeThumbnail
  }
  channelTitle: string
  channelId: string
  channelUrl: string
  title: string
  description: string
  thumbnails: {
    default: YoutubeThumbnail
    medium: YoutubeThumbnail
    high: YoutubeThumbnail
  }
  url: string
  etag: string
  date: string
  statistics?: Statistics
}

let keyI = 0
const keys = (process.env.YOUTUBE_JKT48 ?? "").split(",").map(i=> i.trim())
function getYoutubeKey(){
  return keys[keyI % keys.length]
}


let lastSuccessData: JKT48Video[];
export async function getJKT48YoutubeVideo() {
  try {
    keyI++
    const jkt48tv = await searchYoutube(jkt48TVChannelId)
    const jkt48 = await searchYoutube(jkt48ChannelId)
    lastSuccessData = await getVideoDetails([...jkt48tv, ...jkt48].sort((a, b) => dayjs(b.date).diff(a.date)).slice(0, 10))
    return lastSuccessData
  }
  catch (e) {
    console.error(e)
    if(lastSuccessData) return lastSuccessData
    throw new Error('Youtube search failed!')
  }
}

async function searchYoutube(channelId: string, result: JKT48Video[] = [], nextPageToken: string | null = null) {
  const data = await ofetch<YoutubeSearchResult>('https://www.googleapis.com/youtube/v3/search', {
    query: {
      part: 'snippet',
      channelId,
      key: getYoutubeKey(),
      pageToken: nextPageToken ?? undefined,
      maxResults: 10,
      order: 'date',
    },
  })

  result.push(...data.items.map((i) => {
    const p = profile.get(i.snippet?.channelId)
    return {
      id: i.id.videoId,
      profilePict: p.thumbnails,
      channelTitle: i.snippet?.channelTitle,
      channelId: i.snippet?.channelId,
      channelUrl: p?.customUrl,
      title: i.snippet?.title,
      description: i.snippet?.description,
      thumbnails: i.snippet?.thumbnails,
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      etag: i.etag,
      date: i.snippet?.publishTime,
    }
  }))

  return result
}

profile.set(jkt48TVChannelId, {
  thumbnails: {
    default: {
      url: 'https://yt3.ggpht.com/eFmDTrRup0j5sSqoPSuscvE6MSeGefH5Extvc-xo_CtgEgyIrUphg9sfpaUMcmnln5maDeP6=s88-c-k-c0x00ffffff-no-rj',
      width: 88,
      height: 88,
    },
    medium: {
      url: 'https://yt3.ggpht.com/eFmDTrRup0j5sSqoPSuscvE6MSeGefH5Extvc-xo_CtgEgyIrUphg9sfpaUMcmnln5maDeP6=s240-c-k-c0x00ffffff-no-rj',
      width: 240,
      height: 240,
    },
    high: {
      url: 'https://yt3.ggpht.com/eFmDTrRup0j5sSqoPSuscvE6MSeGefH5Extvc-xo_CtgEgyIrUphg9sfpaUMcmnln5maDeP6=s800-c-k-c0x00ffffff-no-rj',
      width: 800,
      height: 800,
    },
  },
  customUrl: '@jkt48tv',
})

profile.set(jkt48ChannelId, {
  thumbnails: {
    default: {
      url: 'https://yt3.ggpht.com/wBipLZF1IVqYGuYsZc0xxj5ist11fQMHWkN6vtBDCojWd8QTTlJLB8tOCOtoh7IRdmGHDn6I=s88-c-k-c0x00ffffff-no-rj',
      width: 88,
      height: 88,
    },
    medium: {
      url: 'https://yt3.ggpht.com/wBipLZF1IVqYGuYsZc0xxj5ist11fQMHWkN6vtBDCojWd8QTTlJLB8tOCOtoh7IRdmGHDn6I=s240-c-k-c0x00ffffff-no-rj',
      width: 240,
      height: 240,
    },
    high: {
      url: 'https://yt3.ggpht.com/wBipLZF1IVqYGuYsZc0xxj5ist11fQMHWkN6vtBDCojWd8QTTlJLB8tOCOtoh7IRdmGHDn6I=s800-c-k-c0x00ffffff-no-rj',
      width: 800,
      height: 800,
    },
  },
  customUrl: '@jkt48',
})

async function getProfilePictures() {
  if (process.env.NODE_ENV === 'development') return
  const res = await ofetch('https://www.googleapis.com/youtube/v3/channels', {
    query: {
      part: 'snippet',
      id: `${jkt48ChannelId},${jkt48TVChannelId}`,
      key: process.env.YOUTUBE_KEY ?? '',
    },
  })

  for (const item of res.items) {
    profile.set(item.id, { thumbnails: item.snippet?.thumbnails, customUrl: item.snippet?.customUrl })
  }
}

async function getVideoDetails(videos: JKT48Video[]): Promise<JKT48Video[]> {
  const videoMap = new Map<string, JKT48Video>()
  for (const v of videos) {
    videoMap.set(v.id, v)
  }

  const res = await ofetch('https://www.googleapis.com/youtube/v3/videos', {
    query: {
      id: videos.map(i => i.id).join(','),
      part: 'snippet,statistics,id',
      key: getYoutubeKey(),
    },
  })

  for (const video of res.items) {
    const v = videoMap.get(video.id)
    if (v) {
      videoMap.set(video.id, { ...v, statistics: video.statistics })
    }
  }

  return [...videoMap.values()]
}

getProfilePictures()
