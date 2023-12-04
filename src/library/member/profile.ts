import Showroom from '@schema/showroom/Showroom'
import { createError } from '@/utils/errorResponse'

export async function getMemberDetails(key: string) {
  const data = await Showroom.getProfile(key)
  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  return data
}
