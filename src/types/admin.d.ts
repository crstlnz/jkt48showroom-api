declare namespace Admin {
  type I48Member = Database.I48Member & { _id: string | null }
  type IShowroomMember = Omit<Database.IShowroomMember, 'member_data'> & {
    _id: string
    member_data: null | I48Member
  }
  interface MissingJiko {
    name?: string
    img?: string
    img_alt?: string
    member_id: string
    room_id: number
    url: string
  }

}
