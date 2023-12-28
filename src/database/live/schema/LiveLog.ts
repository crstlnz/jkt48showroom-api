// import type { Model } from 'mongoose'
// import { Schema } from 'mongoose'

// // import config from '../../../../config'
// import { StageList } from '../../showroomDB/StageList'
// import { liveDB } from '../../'
// import Showroom from '../../schema/showroom/Showroom'
// import config from '@/config'

// // import Showroom from './Showroom'
// // import ShowroomGift from './ShowroomGift'
// // import ShowroomUser from './ShowroomUser'

// interface ILogLiveModel extends Model<Log.Live> {
//   // getDetails(id: string | number): Promise<Database.IShowroomLogDetail>
// }

// const liveLogSchema = new Schema<Log.Live, ILogLiveModel>({
//   is_dev: {
//     type: Boolean,
//     default: false,
//   },
//   custom: {
//     title: String,
//     img: String,
//     banner: String,
//     theater: {
//       title: String,
//       setlist_id: String,
//       price: Number,
//       tax_info: String,
//       date: Date,
//       url: String,
//     },
//   },
//   idn: {
//     id: String,
//     username: String,
//     slug: String,
//   },
//   live_id: {
//     type: Schema.Types.Mixed, // showroom number, idn string
//     unique: false,
//   },
//   data_id: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   live_info: {
//     is_premium: {
//       type: Boolean,
//       default: false,
//     },
//     live_type: Number,
//     comments: {
//       num: Number,
//       users: Number,
//     },
//     screenshots: {
//       folder: String,
//       format: String,
//       list: {
//         type: [Number],
//         default: [],
//       },
//     },
//     background_image: {
//       type: String,
//     },
//     viewers: {
//       active: {
//         type: Number,
//         default: 0,
//       },
//       last: {
//         type: Number,
//         default: 0,
//       },
//       peak: {
//         type: Number,
//         index: true,
//         default: 0,
//       },
//       is_excitement: Boolean,
//     },
//     duration: {
//       index: true,
//       type: Number,
//       default: 0,
//     },
//     date: {
//       start: {
//         type: Date,
//         required: true,
//       },
//       end: {
//         type: Date,
//         required: true,
//         index: true,
//       },
//     },
//   },
//   room_id: {
//     type: Number,
//     index: true,
//   },
//   gift_data: {
//     free_gifts: {
//       type: [
//         {
//           _id: false,
//           gift_id: Number,
//           point: Number,
//           num: Number,
//           users: Number,
//         },
//       ],
//       default: [],
//     },
//     gift_id_list: { type: [Schema.Types.Mixed], default: [] },
//     gift_log: {
//       type: [
//         {
//           _id: false,
//           total: Number,
//           user_id: Schema.Types.Mixed,
//           gifts: [
//             {
//               _id: false,
//               gift_id: Schema.Types.Mixed, // idn string, showroom number
//               num: Number, // showroom
//               gold: Number, // idn
//               point: Number, // idn
//               date: Date,
//             },
//           ],
//         },
//       ],
//       default: [],
//     },
//   },
//   total_gifts: {
//     type: Number,
//     default: 0,
//     index: true,
//   },
//   record_dates: [
//     {
//       _id: false,
//       from: {
//         type: Date,
//         default: () => Date.now(),
//       },
//       to: {
//         type: Date,
//         default: () => Date.now(),
//       },
//     },
//   ],
//   users: {
//     type: [
//       {
//         _id: false,
//         user_id: Number,
//         comments: Number,
//         avatar_id: Number,
//         avatar_url: String,
//         name: String,
//       },
//     ],
//   },
//   gift_rate: Number,
//   created_at: {
//     type: Date,
//     required: true,
//   },
//   type: String,
// })

// async function parseShowroom(doc: Log.Showroom): Promise<Log.ApiShowroom> {
//   const stageListData = await StageList.findOne({ data_id: doc.data_id }).lean()
//   const memberInfo = await Showroom.findOne({ room_id: doc.room_id }).populate({
//     path: 'member_data',
//     select: 'img isGraduate banner jikosokai name nicknames',
//   }).lean()
//   const userMap = new Map<number, Database.IFansCompact>()
//   const users = doc.users?.map(u => ({
//     id: u.user_id,
//     avatar_id: u.avatar_id,
//     name: u.name,
//   }))

//   for (const usr of users) {
//     userMap.set(usr.id, usr)
//   }

//   const giftLog = doc.gift_data?.gift_log?.map(i => ({
//     total: i.total,
//     user_id: i.user_id,
//     gifts: i.gifts?.map(g => ({
//       id: g.gift_id,
//       num: g.num,
//       date: g.date.toISOString(),
//     })),
//   })).sort((a, b) => b.total - a.total)

//   return {
//     data_id: doc.data_id,
//     live_id: doc.live_id,
//     room_info: {
//       name: memberInfo?.name ?? 'Member not found!',
//       nickname: doc.custom?.title ?? doc.custom?.theater?.title ?? memberInfo?.member_data?.nicknames?.[0],
//       fullname: memberInfo?.member_data?.name,
//       img: doc.custom?.img ?? memberInfo?.img ?? config.errorPicture,
//       img_alt: doc.custom?.img ?? memberInfo?.member_data?.img ?? memberInfo?.img_square,
//       url: memberInfo?.url ?? '',
//       is_graduate: memberInfo?.member_data?.isGraduate ?? memberInfo?.is_group ?? false,
//       is_group: memberInfo?.is_group ?? false,
//       banner: memberInfo?.member_data?.banner ?? '',
//       jikosokai: memberInfo?.member_data?.jikosokai ?? '',
//       generation: memberInfo?.generation ?? '',
//       group: memberInfo?.group ?? '',
//     },
//     live_info: {
//       duration: doc.live_info?.duration ?? 0,
//       comments: doc.live_info?.comments,
//       screenshot: doc.live_info?.screenshots,
//       background_image: doc.live_info?.background_image,
//       stage_list: stageListData?.stage_list ?? [],
//       viewers: {
//         num: doc.live_info.viewers?.peak ?? 0,
//         active: doc.live_info.viewers?.active ?? 0,
//         is_excitement: doc.live_info.viewers?.is_excitement ?? false,
//       },
//       date: doc.live_info.date,
//       gift: {
//         log: giftLog,
//         // next_page: per_page < doc.gift_data?.gift_log?.length,
//         list:
//           doc.gift_data?.gift_list?.map(g => ({
//             id: g.gift_id,
//             free: g.free,
//             point: g.point,
//           })) ?? [],
//         free: doc.gift_data?.free_gifts ?? [],
//       },
//     },
//     gift_rate: doc.gift_rate,
//     room_id: doc.room_id,
//     total_gifts: doc.total_gifts,
//     users: userMap,
//     created_at: doc.created_at.toISOString(),
//   }
// }

// liveLogSchema.statics.getDetails = async function (dataId: string | number): Promise<any | null> {
//   const doc = await this.findOne({ data_id: dataId })
//     .populate({
//       path: 'user_list',
//       options: { select: '-_id name avatar_url user_id image' },
//     })
//     .populate({
//       path: 'room_info',
//       options: {
//         select: '-_id name img url -room_id member_data is_group generation group img_square',
//         populate: {
//           path: 'member_data',
//           select: 'img isGraduate banner jikosokai name nicknames',
//         },
//       },
//     })
//     .populate({
//       path: 'gift_data.gift_list',
//       options: { select: '-_id gift_id free image point' },
//     })
//     .lean()

//   if (!doc) return null

//   return await parseShowroom(doc as Log.Showroom)
// }

// liveLogSchema.index({ data_id: 1 }, { unique: true })
// liveLogSchema.index({ data_id: 1, room_id: 1, is_dev: 1 })
// liveLogSchema.index({ 'users.user_id': 1, 'room_id': 1, 'is_dev': 1 })
// export default liveDB.model<Log.Live, ILogLiveModel>('LiveLog', liveLogSchema)
