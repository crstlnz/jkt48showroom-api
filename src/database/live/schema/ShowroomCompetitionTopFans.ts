import { model, Schema } from 'mongoose'

const showroomCompetitionTopFansSchema = new Schema({
  event_id: {
    type: Number,
    required: true,
    index: true,
  },
  room_id: {
    type: Number,
    required: true,
    index: true,
  },
  snapshot_hour: {
    type: Date,
    required: true,
    index: true,
  },
  scraped_at: {
    type: Date,
    required: true,
  },
  top_fans: {
    type: [{
      _id: false,
      user_id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        default: '',
      },
      avatar_url: {
        type: String,
        default: '',
      },
      point: {
        type: Number,
        default: 0,
      },
      gold: {
        type: Number,
        default: 0,
      },
      c_gift: {
        type: Number,
        default: 0,
      },
      visit_count: {
        type: Number,
        default: 0,
      },
      total_comments: {
        type: Number,
        default: 0,
      },
      contribution_rank: {
        type: Number,
        default: 0,
      },
    }],
    required: true,
    default: [],
  },
}, {
  strict: true,
  minimize: false,
  timestamps: true,
})

showroomCompetitionTopFansSchema.index({ event_id: 1, room_id: 1, snapshot_hour: 1 }, { unique: true })
showroomCompetitionTopFansSchema.index({ room_id: 1, snapshot_hour: -1 })
showroomCompetitionTopFansSchema.index({ event_id: 1, snapshot_hour: -1 })

export default model('ShowroomCompetitionTopFans', showroomCompetitionTopFansSchema)
