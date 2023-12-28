declare namespace IDNEvent {
  interface System {
    user: {
      id: string
      name: string
      avatar: string
    }
    system: {
      is_hide: boolean
      type: string
      message: string
    }
  }

  interface Gift {
    user: {
      id: string
      name: string
      username: string
      avatar: string
    }
    gift: IDN.Gift
  }
}
