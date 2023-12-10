interface LoginData {
  csrf?: string
  username?: string
  password?: string
  captcha_word?: string
  cookie?: string
}

interface EncryptedText {
  nonce: string
  encryptedText: string
}

declare namespace ShowroomLogin {
  interface Data {
    ok: 0 | 1
    is_room_owner: 0 | 1
    user_id: number
    room_id: number
    account_id: string
  }

  interface Error {
    error: string
    captcha_url?: string
  }

  interface Session {
    sr_id: string
    csrf_token: string
  }

  interface User {
    id: string
    name: string
    account_id: string
    image: string
    avatar_id: string
    sr_id: string
    exp: number
  }
}
