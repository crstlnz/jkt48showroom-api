type GiftSize = 'small' | 'medium'
type OrderType = 1 | -1
type SortType = 'date' | 'gift' | 'views' | 'duration'

interface ErrorResponse {
  status?: number
  message?: string
  path?: string
}

interface RecentsQuery {
  room_id?: number
  sort?: string
  order?: number
  search?: string
  page?: number
  perpage?: number
  filter?: 'graduated' | 'active' | 'all'
  date?: QueryDateRange
  group?: Group
}

interface IMember {
  name: string
  nicknames: string[]
  bloodType?: string
  height?: string
  img: string
  img_alt?: string
  url: string
  description?: string
  group?: string
  room_id: number
  room_exists: boolean
  is_graduate: boolean
  is_group: boolean
  generation?: string
}

interface IRecent {
  data_id: string
  member: {
    name: string
    nickname?: string
    img: string
    img_alt?: string
    url: string
    is_graduate: boolean
    is_official: boolean
  }
  created_at: string
  live_info: {
    duration: number
    viewers?: {
      num: number
      is_excitement: boolean
    }
    date: {
      start: string
      end: string
    }
  }
  room_id: number
  points: number
}

interface IApiRecents {
  recents: IRecent[]
  page: number
  perpage: number
  total_count: number
}

interface IRecentDetail {
  data_id: string
  live_id?: number
  room_info: Database.IMemberBasicData
  live_info: API.ILiveInfo
  jpn_rate?: number
  room_id: number
  total_point: number
  users: IFansCompact[]
  created_at: string
  fans: IStatFans[]
}

interface IApiGifts {
  gifts: IUserGiftList[]
  users: IFansCompact[]
  search: string
  page: number
  perpage: number
  total_count: number
}

interface INowLive {
  name: string
  img: string
  img_alt?: string
  url: string
  room_id: number
  is_graduate: boolean
  is_group: boolean
  room_exists: boolean
  started_at: string | number
  streaming_url_list: ShowroomAPI.StreamingURL[]
  is_premium?: boolean
}

interface INextLive {
  name: string
  img: string
  img_alt?: string
  url: string
  room_id: number
  is_graduate: boolean
  room_exists: boolean
  is_group: boolean
  date: string
}

interface ShowroomRecord {
  title: string
  data_id: string
  key: string // for i18n
  name: string
  img: string
  url: string
  room_id: number
  date: string
  value: string
  parser?: ParseType // for value parse
}

interface IApiTheaterDetailList {
  shows: IApiTheaterDetail[]
  date: string
}

interface IApiNews {
  news: JKT48.News[]
  page: number
  perpage: number
  total_count: number
}

interface IMemberBirthDay {
  name: string
  birthdate: string
  img: string
  room_id?: string
  url_key?: string
}

interface BirthdayData {
  data: IMemberBirthDay[]
  date: Date
}

interface ISortMember {
  id: string
  name: string
  img: string
  generation?: string
  is_graduate: boolean
}

interface ParsedCookie {
  value: string
  attributes: { [key: string]: string }
}

type HistoryType = 'top100' | 'top50' | 'top13' | 'gifter'
interface IHistoryRecents {
  recents: (IRecent & { type: HistoryType, user?: Database.UserData & { giftSpent: number } })[]
  page: number
  perpage: number
  total_count: number
}

interface IStageListApi {
  stage_list: Database.IStage[]
  users: Database.IFansCompact[]
}

interface IMiniRoomProfile {
  follower: number
  is_follow: boolean
  visit_count: number
  room_level: number
}
