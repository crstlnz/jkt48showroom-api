import { Schema } from 'mongoose'
import { userDB } from '..'

interface UserLog {
  data_id: string
  users: Log.ShowroomMiniUser[] | Log.IDNMiniUser[]
  created_at: string | Date
}

const userLogSchema = new Schema<UserLog>({
  data_id: {
    type: String,
    required: true,
  },
  users: {
    type: [
      {
        _id: false,
        user_id: Schema.Types.Mixed, // showroom number , idn string
        name: String,
        comments: Number,
        avatar_id: Number, // showroom
        avatar_url: String, // idn
      },
    ],
    default: [],
  },
  created_at: Date,
})

// liveLogSchema.virtual('room_info', {
//   ref: Showroom,
//   localField: 'room_id',
//   foreignField: 'room_id',
//   justOne: true,
// })

// liveLogSchema.index({ data_id: 1 }, { unique: true })
// liveLogSchema.index({ data_id: 1, room_id: 1, is_dev: 1 })
export default userDB.model('UserLog', userLogSchema)
