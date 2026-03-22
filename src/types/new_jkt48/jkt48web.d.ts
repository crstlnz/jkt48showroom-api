declare namespace JKT48Web {
  interface BaseEvent {
    code: string
    link: string
    schedule_id: number

    default_price: number
    total_quota: number
    max_purchase: number

    valid_date_from?: Date
    valid_date_to?: Date

    created_date?: Date
    modified_date?: Date

    created_by: number
    modified_by?: number
    is_birthday: boolean

    date?: Date
    start_time?: Date
    end_time?: Date

    reception_start_time: string
    reception_end_time: string

    seating_layout: string
    jkt48_member_type?: string

    background_image?: string

    title: string
    short_description?: string
    content_body?: string

    jkt48_member: JKT48Member[]
    sales_period: SalesPeriod[]
  }

  interface Event extends BaseEvent {
    type: 'event'
    event_id: number
    is_in_theater: boolean
    is_external_ticketing: boolean
    external_ticketing_url?: string
  }

  interface TheaterShow extends BaseEvent {
    type: 'show'
    theater_show_id: number
    set_list: string
    birthday_member: JKT48Member[]
    showroom?: ShowroomPremiumLiveWithPrice
    idn_live?: JKT48.IDNPremiumLive
  }

  interface OtherSchedule {
    type: string
  }

  type Schedule = Event | TheaterShow | OtherSchedule
  type ScheduleKind = Event['type'] | TheaterShow['type'] | 'schedule' | 'general' | string
  type DateLike = Nullable<string | Date>
}
