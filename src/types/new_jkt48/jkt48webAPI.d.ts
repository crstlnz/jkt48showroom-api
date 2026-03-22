declare namespace JKT48Web {
  type Nullable<T> = T | null

  interface ApiResponse<T> {
    status: boolean
    message: string
    data: T
  }

  interface JKT48Member {
    name: string
    type: string
    member_id: number
  }

  interface SalesPeriod {
    label: string
    start_date: string
    end_date: string
    sales_method: 'FCFS' | 'RAFFLE' | string
    pricing: Pricing[]
  }

  interface Pricing {
    label: string
    price: number
    quota: number
    is_ofc_only: boolean
  }

  interface PaginationMeta {
    page: number
    limit_per_page: number
    total_page: number
    count_per_page: number
    count_total: number
  }

  interface BaseEventApi {
    code: string
    default_price: number
    total_quota: number
    max_purchase: number
    sort_order: number | null

    valid_date_from: string
    valid_date_to: string | null

    status: boolean
    created_date: string
    modified_date: string | null

    created_by: number
    modified_by: number | null

    date: string
    start_time: string
    end_time: string

    reception_start_time: string
    reception_end_time: string

    seating_layout: string
    jkt48_member_type: string | null

    background_image: string | null

    title: string
    short_description: string | null
    content_body: string | null

    jkt48_member: JKT48Member[]

    valid_date_format: string

    sales_period: SalesPeriod[]
  }

  interface EventApi extends BaseEventApi {
    event_id: number

    is_in_theater: boolean
    is_external_ticketing?: boolean
    external_ticketing_url?: string
  }

  interface TheaterShowApi extends BaseEventApi {
    theater_show_id: number

    set_list: string

    birthday_member: any
    birthday_member_name: string[]
  }

  interface NewsListItem {
    news_id: number
    title: string
    category: string
    link: string
    background_image: string | null
    is_published: boolean
    sort_order: number | null
    valid_date_from: string | Date
    valid_date_to: string | Date | null
    status: boolean
  }

  interface NewsDetail extends NewsListItem {
    short_description: string | null
    content_body: string | null
    external_url: string | null
  }

  interface NewsDetailApiRaw {
    title: string
    category: string
    link: string
    background_image: string
    is_published: boolean
    sort_order: null
    valid_date_from: string
    valid_date_to: null
    status: boolean
    short_description: null
    content_body: string
    external_url: null
  }

  interface NewsDetailPayload {
    count: string
    result: NewsDetailApiRaw
  }

  interface ScheduleListItemApi {
    link: string
    schedule_id: number
    date: string
    start_time: string
    end_time: string
    type: string
    status: boolean
    content_body: string | null
    short_description: string | null
    title: string
    jkt48_member_type: string | null
    birthday_member: string | null
    reference_code: string | null
  }

  type ScheduleApi = Partial<EventApi & TheaterShowApi & ScheduleListItemApi>
}
