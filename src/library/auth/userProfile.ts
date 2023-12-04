import { ofetch } from 'ofetch'

export async function getUserProfile(user_id: string | number, sr_id?: string) {
  return await ofetch<ShowroomAPI.UserProfile>('https://www.showroom-live.com/api/user/profile', { params: { user_id }, headers: {
    Cookie: sr_id ? `sr_id=${sr_id}` : '',
  } })
}
