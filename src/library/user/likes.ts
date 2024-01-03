import Liked from '@/database/schema/user/Liked'
import { createError } from '@/utils/errorResponse'

export async function getLikes(userId: string | number): Promise <Database.LikeList> {
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  return await Liked.getList(userId)
}

export async function getLike(query: any, userId: string): Promise <Database.IsLike> {
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  if (query.data_id == null) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  const liked = await Liked.isLiveLiked(userId, query.data_id)
  return {
    is_liked: liked,
  }
}

export async function setLike(query: any, userId: string) {
  console.log('set like')
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  console.log(query)
  if (!query.liked_id || !query.type) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  try {
    await Liked.updateOne(
      {
        user_id: userId,
        liked_id: query.liked_id,
        type: query.type,
      },
      {
        $set: {
          user_id: query.user_id,
          liked_id: query.liked_id,
          type: query.type,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    )
  }
  catch (e) {
    console.log(e)
  }
  return {
    status: 200,
    message: 'Success!',
  }
}
export async function deleteLike(query: any, userId: string) {
  console.log(query)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  if (!query?.liked_id || !query?.type) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })

  await Liked.deleteMany({
    user_id: userId,
    liked_id: query.liked_id,
    type: query.type,
  })
  return {
    status: 200,
    message: 'Success!',
  }
}
