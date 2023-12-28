declare namespace IDNPage {
  export interface Data {
    props: Props
    page: string
    query: Query
    buildId: string
    isFallback: boolean
    dynamicIds: number[]
    gssp: boolean
    scriptLoader: any[]
  }

  export interface Props {
    pageProps: PageProps
    __N_SSP: boolean
  }

  export interface PageProps {
    livestream: Livestream
    profile: Profile
  }

  export interface Livestream {
    slug: string
    title: string
    image_url: string
    view_count: number
    status: string
    room_identifier: string
    chat_room_id: string
    live_at: number
    end_at: number
    scheduled_at: number
    gift_icon_url: string
    is_notified: boolean
    category: Category
    creator: Creator
    entity: Entity
    playback_url: string
  }

  export interface Category {
    name: string
    slug: string
  }

  export interface Creator {
    name: string
    image_url: string
    uuid: string
    username: string
    is_follow: boolean
    total_gold: number
  }

  export interface Entity {
    status: null
    livestream_url: string
    livestream_key: string
    playback_url: string
  }

  export interface Profile {
    bio_description: string
    name: string
    username: string
    uuid: string
    is_follow: boolean
    following_count: number
    follower_count: number
    avatar: string
  }

  export interface Query {
    username: string
    slug: string
  }

}
