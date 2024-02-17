import type { Context } from 'hono'
import Liked from '@/database/schema/user/Liked'
import { createError } from '@/utils/errorResponse'
import LiveLog from '@/database/live/schema/LiveLog'
import config from '@/config'

export async function getLikes(c: Context): Promise <IBookmarks> {
  const userId = c.get('user')?.id
  const page = Number(c.req.query('page') || 1) || 1
  let perpage = Number(c.req.query('perpage') || 10) || 10
  if (perpage > 20) perpage = 20
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  const bookmarked = await Liked.find({ user_id: userId, type: 2 }).sort({
    createdAt: -1,
  }).lean() || []

  const totalBookmarks = await Liked.countDocuments({ user_id: userId, type: 2 })
  const bookmarkIds = bookmarked.map(i => i.liked_id)
  const bookmarks = await LiveLog.find({ data_id: bookmarkIds })
    .select({
      live_info: {
        duration: 1,
        viewers: 1,
        date: 1,
      },
      data_id: 1,
      total_gifts: 1,
      created_at: 1,
      room_id: 1,
      room_info: 1,
      type: 1,
    })
    .populate({
      path: 'room_info',
      select: '-_id name img url -room_id member_data is_group',
      populate: {
        path: 'member_data',
        select: '-_id isGraduate img',
      },
    })
    .lean()

  return {
    page,
    perpage,
    bookmarks: bookmarks.map<IRecent>(i => ({
      _id: i._id,
      data_id: i.data_id,
      member: {
        name: i.room_info?.name ?? 'Member not Found!',
        img_alt: i.room_info?.member_data?.info?.img ?? i.room_info?.img ?? config.errorPicture,
        img: i.room_info?.img ?? config.errorPicture,
        url: i.room_info?.member_data?.slug ?? '',
        is_graduate: i.room_info?.is_group ? false : (i.room_info?.member_data?.info?.is_graduate ?? i.room_id === 332503),
        is_official: i.room_info?.is_group ?? false,
      },
      created_at: i.created_at.toISOString(),
      live_info: {
        comments: i.live_info?.comments ?? undefined,
        duration: Number(i.live_info?.duration ?? 0),
        viewers: {
          num: i.live_info.viewers?.peak ?? 0,
          active: i.live_info.viewers?.active ?? 0,
          is_excitement: (i as any).live_info.viewers?.is_excitement ?? false,
        },
        date: {
          start: i.live_info.date.start.toISOString(),
          end: i.live_info.date.end.toISOString(),
        },
      },
      room_id: i.room_id,
      points: i.total_gifts,
      type: i.type,
    })).sort((a, b) => {
      return bookmarkIds.indexOf(a.data_id) - bookmarkIds.indexOf(b.data_id)
    }),
    total_count: totalBookmarks,
  }
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
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
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
