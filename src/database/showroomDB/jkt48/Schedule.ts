import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

const eventSchema = new Schema<JKT48.Schedule>({
  id: {
    unique: true,
    required: true,
    type: String,
  },
  label: String,
  title: String,
  url: String,
  date: Date,
})

export default jkt48DB.model<JKT48.Schedule>(
  'JKT48Schedule',
  eventSchema,
)
