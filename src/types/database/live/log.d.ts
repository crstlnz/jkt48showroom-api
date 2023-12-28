declare namespace Log {
  interface MemberInfo {
    name: string
    nickname?: string
    fullname?: string
    img: string
    img_alt?: string
    url: string
    is_graduate: boolean
    is_group: boolean
    banner: string
    jikosokai: string
    generation: string
    group: string
  }

  interface ApiShowroom extends Showroom {
    users: Map<string, Database.IU>
  }

  interface Base {
    is_dev: boolean
    live_id: string | number
    data_id: string
    room_id: number
    total_gifts: number
    record_dates: Live.RecordDate[]
    gift_rate: number // gift rate showroom in jpy
    room_info?: MemberInfo
    created_at: Date
    type: 'showroom' | 'idn'
  }

  interface BaseLiveInfo {
    comments?: Live.Comments
    screenshots?: Live.Screenshots
    duration: number
    date: {
      start: Date
      end: Date
    }
  }

  interface IDNLiveInfo extends BaseLiveInfo {
    viewers: Live.Viewers
  }

  interface ShowroomLiveInfo extends BaseLiveInfo {
    viewers: Live.Viewers & { is_excitement: boolean }
    is_premium: boolean
    live_type?: number
    background_image?: string
  }

  interface IDN extends Base {
    idn: {
      id: string
      username: string
      slug: string
    }
    gift_data: {
      gift_id_list: string[]
      gift_log: DatabaseIDN.UserGift[]
    }
    live_info: IDNLiveInfo
    users: DatabaseIDN.MiniUser[]
    type: 'idn'
  }

  interface Showroom extends Base {
    custom?: Database.CustomData
    live_info: ShowroomLiveInfo
    gift_data: {
      free_gifts: Database.FreeGift[]
      gift_id_list: number[]
      gift_list?: Database.IShowroomGift[]
      gift_log: Database.IUserGift[]
    }
    users: Database.UserData[]
    type: 'showroom'
  }

  type Live = Log.Showroom | Log.IDN
}
