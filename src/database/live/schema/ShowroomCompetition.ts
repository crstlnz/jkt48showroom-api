import { model, Schema } from 'mongoose'

const showroomCompetitionSchema = new Schema({
  event_id: {
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
  event: {
    type: {
      _id: false,
      event_name: {
        type: String,
        required: true,
      },
      event_type: {
        type: String,
        default: '',
      },
      show_ranking: {
        type: Number,
        default: 0,
      },
      started_at: {
        type: Number,
        required: true,
      },
      ended_at: {
        type: Number,
        required: true,
      },
      image: {
        type: String,
        default: '',
      },
      event_url: {
        type: String,
        default: '',
      },
    },
    required: true,
  },
  ranking: {
    type: [{
      _id: false,
      rank: {
        type: Number,
        required: true,
      },
      point: {
        type: Number,
        required: true,
      },
      room: {
        type: {
          _id: false,
          room_id: {
            type: Number,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
          image: {
            type: String,
            default: '',
          },
          image_square: {
            type: String,
            default: '',
          },
        },
        required: true,
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

showroomCompetitionSchema.index({ event_id: 1, snapshot_hour: 1 }, { unique: true })
showroomCompetitionSchema.index({ snapshot_hour: -1 })

export default model('ShowroomCompetition', showroomCompetitionSchema)
