import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

const memberSchema = new Schema<JKT48.Member>({
  id: {
    required: true,
    unique: true,
    type: String,
  },
  old_id: String,
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
