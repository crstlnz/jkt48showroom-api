interface YoutubeSearchResult {
  kind: string
  etag: string
  nextPageToken?: string
  regionCode: string
  pageInfo: PageInfo
  items: Item[]
}

interface PageInfo {
  totalResults: number
  resultsPerPage: number
}

interface Item {
  kind: string
  etag: string
  id: Id
  snippet: Snippet
}

interface Id {
  kind: string
  videoId: string
}

interface Snippet {
  publishedAt: string
  channelId: string
  title: string
  description: string
  thumbnails: Thumbnails
  channelTitle: string
  liveBroadcastContent: string
  publishTime: string
}

interface Thumbnails {
  default: Default
  medium: Medium
  high: High
}

interface Default {
  url: string
  width: number
  height: number
}

interface Medium {
  url: string
  width: number
  height: number
}

interface High {
  url: string
  width: number
  height: number
}
