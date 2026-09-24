import type { Document } from 'mongoose'
import { Schema } from 'mongoose'
import { liveDB } from '@/database'

export interface BetaKey extends Document {
  keyHash: string
  expiresAt: Date
  maxDevices?: number
  enrollmentVersion: number
  lastUsedAt?: Date
  note?: string
}

const BetaKeySchema = new Schema<BetaKey>(
  {
    keyHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    maxDevices: { type: Number, min: 1 },
    enrollmentVersion: { type: Number, required: true, default: 0 },
    lastUsedAt: { type: Date },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
)

export const BetaKeyModel = liveDB.model<BetaKey>('BetaKey', BetaKeySchema, 'betakeys')
