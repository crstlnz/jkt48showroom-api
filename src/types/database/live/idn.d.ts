declare namespace DatabaseIDN {
  interface User extends IDN.User {
    gold: number
    point: number
    last_seen?: string
  }

  interface MiniUser {
    user_id: string
    name: string
    comments: number
    avatar_url?: string
  }

  interface Gift {
    gift_id: string
    gold: number
    point: number
    date: Date
  }

  interface UserGifts {
    total: number
    user_id: string
    gifts: Gift[]
  }

}
