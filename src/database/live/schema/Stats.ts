import { Schema } from 'mongoose'
import { liveDB } from '../../'

const statsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  group: {
    type: String,
    required: true,
    index: true,
  },
  month: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    from: {
      type: Date,
      required: true,
    },
    to: {
      type: Date,
      required: true,
    },
  },
  generated_at: {
    type: Date,
    required: true,
    index: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true,
  },
}, {
  strict: true,
  minimize: false,
  timestamps: true,
})

statsSchema.index({ type: 1, group: 1, month: 1 }, { unique: true })

export default liveDB.model('Stats', statsSchema)
