import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

const eventSchema = new Schema<JKT48.EventDetail>({
  id: {
    unique: true,
    required: true,
    type: String,
  },
  title: String,
  title_alt: String,
  description: String,
  poster: String,
  banner: String,
  gallery: {
    type: [String],
    default: [],
  },
})

export default jkt48DB.model<JKT48.EventDetail>(
  'JKT48EventDetail',
  eventSchema,
)
