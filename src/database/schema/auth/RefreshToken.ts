import { Schema, model } from 'mongoose'
import config from '@/config'
import { refreshTokenTime } from '@/utils/security/cookies/refreshToken'

interface RefreshToken {
  userId: number
  token: string
  isUsed: boolean
  createdAt: Date
  expiresAt: Date
}

const refreshTokenSchema = new Schema<RefreshToken>({
  userId: {
    type: Number,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + refreshTokenTime * 1000),
  },
})

export default model<RefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
)
