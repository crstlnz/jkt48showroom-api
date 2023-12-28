declare namespace WatcherIDN {
  interface UserGifts {
    id: string
    name: string
    username: string
    avatar: string
    total: {
      gold: number
      point: number
    }
    gifts: IDN.Gift[]
  }

  interface InitialData {
    botId: string
    data: IDN.Watcher
    data_id?: string
    room_identifier?: string
    activeUsers?: string[]
    viewers?: Live.Viewers
    comments?: IDN.Comment[]
    giftList?: IDN.Gift[]
    giftLog?: IDN.UserGift[]
    users?: DatabaseIDN.User[]
    screenshots?: Live.Screenshots
    messages?: Live.DiscordMessage[]
    initialComment?: Live.Comments
    recordDates?: Live.RecordDate[]
    goldRate?: number
    startedAt?: Date
  }
}
