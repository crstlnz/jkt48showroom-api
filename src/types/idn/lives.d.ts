declare namespace IDN {
  interface User {
    id: string
    name: string
    username: string
    avatar: string
    color_code?: string
  }

  interface Live {
    user: IDNUser
    image: string
    title: string
    slug: string
    view_count: number
    live_at: string
    stream_url: string
  }

  interface Gift {
    name: string
    slug: string
    gold: number
    point: number
    image_url?: string
    animation_small?: string | null
    animation_large?: string | null
    bg_color: string
    exp: number
    theme?: {
      name: string
      slug: string
    }
  }

  interface Comment {
    user: User
    chat: {
      pinned: boolean
      message: string
    }
    time: Date
  }

  interface UserGift {
    user: User
    gift: Gift
    time: Date
  }

  interface Watcher extends Live {
    chat_room_id: string
    room_identifier: string
    showroom_id: number
  }

  export interface LiveToken {
    status: number
    message: string
    data: DataToken
    error: null
  }

  export interface DataToken {
    session_expiration_time: number
    token: string
    token_expiration_time: number
  }

}
