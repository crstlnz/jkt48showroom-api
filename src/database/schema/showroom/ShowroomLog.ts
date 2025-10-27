import type { Model } from 'mongoose'
import { model, Schema } from 'mongoose'
import config from '@/config'
import { StageList } from '../../showroomDB/StageList'
import Showroom from './Showroom'
import ShowroomGift from './ShowroomGift'
import ShowroomUser from './ShowroomUser'

interface IShowroomLogModel extends Model<Database.IShowroomLog> {
  getDetails: (id: string | number) => Promise<Database.IShowroomLogDetail>
}

const showroomLogSchema = new Schema<Database.IShowroomLog, IShowroomLogModel>({
  is_dev: {
    type: Boolean,
    default: false,
  },
  custom: {
    title: String,
    img: String,
    banner: String,
    theater: {
      title: String,
      setlist_id: String,
      price: Number,
      tax_info: String,
      date: Date,
      url: String,
    },
  },
  live_id: {
    type: Number,
    unique: true,
  },
  jpn_rate: Number,
  data_id: {
    type: String,
    required: true,
    unique: true,
  },
  live_info: {
    is_premium: {
      type: Boolean,
      default: false,
    },
    live_type: Number,
    comments: {
      num: Number,
      users: Number,
    },
    screenshot: {
      folder: String,
      format: String,
      list: {
        type: [Number],
        default: [],
      },
    },
    background_image: {
      type: String,
    },
    viewers: {
      active: {
        type: Number,
        default: 0,
      },
      last: {
        type: Number,
        default: 0,
      },
      peak: {
        type: Number,
        index: true,
        default: 0,
      },
      is_excitement: Boolean,
    },
    duration: {
      type: Number,
      default: 0,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  room_id: {
    type: Number,
  },
  gift_data: {
    free_gifts: {
      type: [
        {
          _id: false,
          gift_id: Number,
          point: Number,
          num: Number,
          users: Number,
        },
      ],
      default: [],
    },
    gift_id_list: { type: [Number], default: [] },
    gift_log: {
      type: [
        {
          _id: false,
          total: Number,
          user_id: Number,
          gifts: [
            {
              _id: false,
              gift_id: Number,
              num: Number,
              date: Date,
            },
          ],
        },
      ],
      default: [],
    },
  },
  total_point: {
    type: Number,
    default: 0,
    index: true,
  },
  record_dates: [
    {
      _id: false,
      from: {
        type: Date,
        default: () => Date.now(),
      },
      to: {
        type: Date,
        default: () => Date.now(),
      },
    },
  ],
  created_at: {
    type: Date,
    required: true,
  },
  users: {
    type: [
      {
        _id: false,
        user_id: Number,
        avatar_url: String,
        avatar_id: {
          type: Number,
          default: 1,
        },
        name: String,
      },
    ],
  },
})

showroomLogSchema.virtual('room_info', {
  ref: Showroom,
  localField: 'room_id',
  foreignField: 'room_id',
  justOne: true,
})

showroomLogSchema.virtual('gift_data.gift_list', {
  ref: ShowroomGift,
  localField: 'gift_data.gift_id_list',
  foreignField: 'gift_id',
})

showroomLogSchema.virtual('user_list', {
  ref: ShowroomUser,
  localField: 'users.user_id',
  foreignField: 'user_id',
})

showroomLogSchema.statics.getDetails = async function (dataId: string | number): Promise<Database.IShowroomLogDetail | null> {
  const doc = await this.findOne({ data_id: dataId })
    .populate({
      path: 'user_list',
      options: { select: '-_id name avatar_url user_id image' },
    })
    .populate({
      path: 'room_info',
      options: {
        select: '-_id name img url -room_id member_data is_group generation group img_square',
        populate: {
          path: 'member_data',
          select: 'img isGraduate banner jikosokai name nicknames',
        },
      },
    })
    .populate({
      path: 'gift_data.gift_list',
      options: { select: '-_id gift_id free image point' },
    })
    .lean()

  if (!doc) return null

  const stageListData = await StageList.findOne({ data_id: dataId }).lean()
  const userMap = new Map<number, Database.IFansCompact>()
  // const selectedUser = new Map<number, Database.IFansCompact>()

  const users = doc.users?.map(u => ({
    id: u.user_id,
    avatar_id: u.avatar_id,
    name: u.name,
  }))

  for (const usr of users) {
    userMap.set(usr.id, usr)
  }

  const giftLog = doc.gift_data?.gift_log?.map(i => ({
    total: i.total,
    user_id: i.user_id,
    gifts: i.gifts?.map(g => ({
      id: g.gift_id,
      num: g.num,
      date: g.date.toISOString(),
    })),
  })).sort((a, b) => b.total - a.total)

  return {
    data_id: doc.data_id,
    live_id: doc.live_id,
    room_info: {
      name: doc.room_info?.name ?? 'Member not found!',
      nickname: doc.custom?.title ?? doc.custom?.theater?.title ?? doc.room_info?.member_data?.info?.nicknames?.[0],
      fullname: doc.room_info?.member_data?.name,
      img: doc.custom?.img ?? doc.room_info?.img ?? config.errorPicture,
      img_alt: doc.custom?.img ?? doc.room_info?.member_data?.info?.img ?? doc.room_info?.img_square,
      url: doc.room_info?.url ?? '',
      is_graduate: doc.room_info?.member_data?.info?.is_graduate ?? doc.room_info?.is_group ?? false,
      is_group: doc.room_info?.is_group ?? false,
      banner: doc.room_info?.member_data?.info?.banner ?? '',
      jikosokai: doc.room_info?.member_data?.info?.jikosokai ?? '',
      generation: doc.room_info?.generation ?? '',
      group: doc.room_info?.group ?? '',
    },
    live_info: {
      duration: doc.live_info?.duration ?? 0,
      comments: doc.live_info?.comments,
      screenshot: doc.live_info?.screenshot,
      background_image: doc.live_info?.background_image,
      stage_list: stageListData?.stage_list ?? [],
      viewers: {
        num: doc.live_info.viewers?.peak ?? 0,
        active: doc.live_info.viewers?.active ?? 0,
        is_excitement: doc.live_info.viewers?.is_excitement ?? false,
      },
      date: {
        start: doc.live_info?.start_date.toISOString(),
        end: doc.live_info?.end_date.toISOString(),
      },
      gift: {
        log: giftLog,
        // next_page: per_page < doc.gift_data?.gift_log?.length,
        list:
          doc.gift_data?.gift_list?.map(g => ({
            id: g.gift_id,
            free: g.free,
            point: g.point,
          })) ?? [],
        free: doc.gift_data?.free_gifts ?? [],
      },
    },
    jpn_rate: doc.jpn_rate,
    room_id: doc.room_id,
    total_point: doc.total_point,
    users: userMap,
    created_at: doc.created_at.toISOString(),
  }
}

export default model<Database.IShowroomLog, IShowroomLogModel>('ShowroomLog', showroomLogSchema)
