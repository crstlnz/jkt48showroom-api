import { Schema } from 'mongoose'
import Member from './Member'
import Setlist from './Setlist'
import { jkt48DB } from '@/database'

const theaterSchema = new Schema<JKT48.Theater>({
  id: {
    unique: true,
    required: true,
    type: String,
  },
  title: {
    type: String,
    default: '',
  },
  url: {
    type: String,
    default: '',
  },
  memberIds: {
    type: [Number],
    default: [],
  },
  setlistId: String,
  seitansaiIds: {
    type: [Number],
    default: [],
  },
  graduationIds: {
    type: [Number],
    default: [],
  },
  date: {
    type: Date,
    required: true,
  },
  team: {
    id: String,
    img: String,
  },
  showroomTheater: {
    entrance_url: String,
    room_url: String,
    image: String,
    premium_live_type: Number,
    is_onlive: Boolean,
    title: String,
    paid_live_id: Number,
    room_id: Number,
    room_name: String,
    start_at: Number,
  },
})

theaterSchema.virtual('members', {
  ref: Member,
  localField: 'memberIds',
  foreignField: 'id',
})

theaterSchema.virtual('setlist', {
  ref: Setlist,
  localField: 'setlistId',
  foreignField: 'id',
  justOne: true,
})

theaterSchema.virtual('seitansai', {
  ref: Member,
  localField: 'seitansaiIds',
  foreignField: 'id',
})

theaterSchema.virtual('graduation', {
  ref: Member,
  localField: 'graduationIds',
  foreignField: 'id',
})

export default jkt48DB.model<JKT48.Theater>(
  'JKT48Theater',
  theaterSchema,
)
