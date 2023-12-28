import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

const memberSchema = new Schema<JKT48.Member>({
  id: {
    unique: true,
    required: true,
    type: String,
  },
  name: {
    type: String,
    default: '',
  },
  url: {
    type: String,
    default: '',
  },
})

export default jkt48DB.model<JKT48.Member>(
  'JKT48Member',
  memberSchema,
)
