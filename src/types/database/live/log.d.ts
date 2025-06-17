declare namespace Log {
  type Type = 'showroom' | 'idn'
  interface Base {
    is_dev: boolean
    replay_url: string
    live_id: string | number
    data_id: string
    room_id: number
    c_gift: number
    total_gifts: number
    record_dates: Live.RecordDate[]
    gift_rate: number // gift rate showroom in jpy
    room_info?: Database.IShowroomMember
    created_at: Date
    users?: Log.ShowroomMiniUser[] | Log.IDNMiniUser[] // users field dipindah ke database baru
    type: Type
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

  interface MiniUser {
    user_id: string | number
    name: string
    comments: number
    avatar_id?: number // showroom props
    avatar_url?: string // idn props
  }

  interface IDNMiniUser extends MiniUser {
    user_id: string
  }

  interface ShowroomMiniUser extends MiniUser {
    user_id: number
  }

  interface UserGifts {
    total: number
    user_id: number | string
    gifts: [
      {
        gift_id: number
        num: number
        date: Date
      },
    ]
  }

  interface ShowroomUserGifts extends UserGifts {
    user_id: number
  }

  interface IDNUserGifts extends UserGifts {
    user_id: number
  }

  interface ShowroomCustomData {
    title: string
    img?: string
    banner?: string
    theater?: PremiumTheaterData
  }

  interface FreeGift {
    gift_id: number
    point: number
    num: number
    users: number
  }

  interface IDN extends Base {
    idn: {
      id: string
      username: string
      slug: string
      title: string
      image: string
      discountRate?: number
    }
    gift_data: {
      gift_id_list: string[]
      gift_log: UserGifts[]
    }
    live_info: IDNLiveInfo
    users?: IDNMiniUser[]
    type: 'idn'
  }

  interface Showroom extends Base {
    custom?: ShowroomCustomData
    live_info: ShowroomLiveInfo
    gift_data: {
      free_gifts: FreeGift[]
      gift_id_list: number[]
      gift_log: UserGifts[]
    }
    users?: ShowroomMiniUser[]
    type: 'showroom'
  }

  interface GiftLogData {
    log: ShowroomUserGifts[] | IDNUserGifts[]
    list: IGift[]
    free: FreeGift[]
  }

  interface DetailLiveInfo {
    duration: number
    screenshot?: Live.Screenshots
    comments?: Live.Comments
    viewers: Live.Viewers
    date: ILiveDate
  }

  interface ShowroomLiveInfo extends DetailLiveInfo {
    stage_list: IStage[]
    background_image?: string
  }

  interface Detail {
    data_id: string
    live_id?: number
    room_info: Database.IMemberBasicData
    live_info: Database.IDetailLiveInfo
    jpn_rate?: number
    room_id: number
    total_point: number
    users: Map<number, IFansCompact>
    created_at: string
  }

  type Live = Log.Showroom | Log.IDN
}
