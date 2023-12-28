import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

const eventSchema = new Schema<JKT48.News>({
  id: {
    unique: true,
    required: true,
    type: String,
  },
  label: String,
  title: String,
  content: String,
  url: String,
  date: Date,
})

export default jkt48DB.model<JKT48.News>(
  'JKT48News',
  eventSchema,
)
