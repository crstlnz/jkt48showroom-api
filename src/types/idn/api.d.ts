declare namespace IDNApi {
  export interface GiftResponse {
    status: number
    message: string
    data: Data
    error: null
  }

  export interface Data {
    metadata: Metadata
    gift: IDN.Gift[]
  }

  export interface Theme {
    name: string
    slug: string
  }

  export interface Metadata {
    lowest_price: number
  }

}
