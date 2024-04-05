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
  img: string
  img_alt?: string
  url: string
  description?: string
  group?: GroupType
  room_id?: number
  sr_exists: boolean
  socials?: SocialNetwork[]
  is_graduate: boolean
  generation?: string
  idn_username?: string
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

interface IBookmarks {
  bookmarks: IRecent[]
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

interface IApiGift<T, B> {
  gifts: T[]
  users: B[]
  search: string
  page: number
  perpage: number
  total_count: number
}

type IApiShowroomGift = IApiGift<LogDetail.GiftLog, LogDetail.ShowroomUser>
type IApiIDNGift = IApiGift<LogDetail.GiftLog, LogDetail.IDNUser>

// interface INowLive {
//   name: string
//   img: string
//   img_alt?: string
//   url: string
//   room_id: number
//   is_graduate: boolean
//   is_group: boolean
//   room_exists: boolean
//   started_at: string | number
//   streaming_url_list: ShowroomAPI.StreamingURL[]
//   is_premium?: boolean
// }

interface StreamingURL {
  label: string
  quality: number
  url: string
}

interface INowLive {
  name: string
  img: string
  img_alt?: string
  url_key?: string
  slug?: string
  room_id: number
  is_graduate: boolean
  is_group: boolean
  started_at: string | number
  streaming_url_list: StreamingURL[]
  is_premium?: boolean
  type: 'idn' | 'showroom'
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

interface IApiTheaterDetail {
  id: string
  title: string
  url: string
  setlist?: JKT48.Setlist
  members: JKT48MemberExtend[]
  seitansai: JKT48MemberExtend[]
  graduation: JKT48MemberExtend[]
  showroomTheater?: ShowroomPremiumLive
  date: Date
  team: {
    id: string
    img: string
  }
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

interface IApiTheaterInfo {
  id: string
  title: string
  poster?: string
  banner?: string
  member_count: number
  seitansai?: JKT48MemberExtend[]
  url: string
  date: Date
}

interface IApiTheater {
  theater: IApiTheaterInfo[]
  page: number
  perpage: number
  total_count: number
}

interface IApiEvent {
  theater: {
    upcoming: IApiTheaterInfo[]
    recent: IApiTheaterInfo[]
  }
  other_schedule: JKT48.Schedule[]
}

interface JKT48MemberExtend extends JKT48.Member {
  img?: string
  url_key?: string
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

interface ITheaterAPI extends Database.ITheater {
  poster?: string
}

interface MemberStats {
  missing: {
    showroom: number
    idn: number
  }
  total_live: {
    idn: number
    showroom: number
  }
  most_gift?: {
    id: string
    gift: number
  }
  longest_live?: {
    id: string
    duration: number
  }
  last_live?: {
    id: string
    date: {
      start: string
      end: string
    }
  }
}

interface IMemberProfileAPI extends IMemberBasicData {
  stats: MemberStats
  name: string
  nickname?: string
  fullname: string
  description: string
  img: string
  img_alt: string
  banner: string
  group: string
  url: string
  showroom_id?: number
  showroom_exists: boolean
  jikosokai?: string
  is_graduate: boolean
  is_group: boolean
  socials: SocialNetwork[]
  generation?: string
  birthdate?: Date
  bloodType?: string
  height?: string
  recentTheater?: ITheaterAPI[]
  upcomingTheater?: ITheaterAPI[]
}

interface IDNUser {
  id: string
  name: string
  username: string
  avatar: string
}
interface IDNLives {
  user: IDNUser
  image: string
  title: string
  slug: string
  view_count: number
  live_at: string
  stream_url: string
}

interface IDNLivesDetail {
  user?: IDNUser
  image?: string
  title?: string
  slug?: string
  view_count?: number
  live_at?: string
  stream_url?: string
  is_live: boolean
  member_info: {
    name?: string
    img?: string
    room_id?: number
    key?: string
  }
}
