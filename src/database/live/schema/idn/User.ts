import { Schema } from 'mongoose'
import { userDB } from '../../../'

const idnUserSchema = new Schema<DatabaseIDN.User>({
  id: {
    type: String,
    unique: true,
  },
  name: String,
  username: String,
  avatar: String,
  color_code: String,
  gold: {
    type: Number,
    default: 0,
  },
  point: {
    type: Number,
    default: 0,
  },
})

idnUserSchema.index({ slug: 1 }, { unique: true })
export const IDNUser = userDB.model('IDN_User', idnUserSchema)
