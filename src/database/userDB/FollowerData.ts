import { Schema } from 'mongoose'
import { userDB } from '..'

export interface FollowerScrapeData {
  name: string
  fetchId: string
  date: Date | string
  showroom: {
    id: number
    level: number
    follower: number
  }
  idn: {
    id: string
    follower: number
  }
}

const followerDataSchema = new Schema<FollowerScrapeData>({
  name: String,
  fetchId: {
    type: String,
    unique: true,
  },
  idn: {
    id: String,
    follower: Number,
  },
  showroom: {
    id: Number,
    level: Number,
    follower: Number,
  },
  date: Date,
})

followerDataSchema.index({ 'showroom.id': 1 })
export default userDB.model('FollowerData', followerDataSchema)
