import { model, Schema } from 'mongoose'

const memberSchema = new Schema<IdolMember>({
  name: String,
  info: {
    img: String,
    description: String,
    profile_video: String,
    nicknames: [String],
    kanji: String,
    is_graduate: Boolean,
    socials: [
      {
        _id: false,
        title: String,
        url: String,
      },
    ],
    birthdate: Date,
    height: String,
    jikosokai: String,
    generation: String,
    blood_type: String,
    banner: String,
    graduation_info: {
      date: Date,
      announcement_date: Date,
      last_show: String,
    },
  },
  group: String,
  idn: {
    id: String,
    username: String,
  },
  jkt48id: [String],
  showroom_id: Number,
  stage48: String,
  live_data: {
    missing: {
      showroom: Number,
      idn: Number,
    },
  },
  slug: {
    type: String,
    unique: true,
  },
})

memberSchema.virtual('showroom', {
  ref: 'Showroom',
  localField: 'showroom_id',
  foreignField: 'room_id',
  justOne: true,
})

export default model<IdolMember>(
  'IdolMember',
  memberSchema,
)
