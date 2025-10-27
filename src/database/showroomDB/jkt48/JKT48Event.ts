import { Schema } from 'mongoose'
import { jkt48DB } from '../..'
import EventDetail from './EventDetail'
import Member from './Member'

const eventSchema = new Schema<JKT48.Event>({
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
  eventId: String,
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
    price: Number,
  },
  idnTheater: {
    title: String,
    slug: String,
    image: String,
    start_at: Number,
    username: String,
    uuid: String,
    price: Number,
    room_identifier: String,
  },
})

eventSchema.virtual('members', {
  ref: Member,
  localField: 'memberIds',
  foreignField: 'id',
})

eventSchema.virtual('event', {
  ref: EventDetail,
  localField: 'eventId',
  foreignField: 'id',
  justOne: true,
})

export default jkt48DB.model<JKT48.Event>(
  'JKT48Event',
  eventSchema,
)
