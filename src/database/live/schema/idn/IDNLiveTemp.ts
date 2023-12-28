import { Schema } from 'mongoose'
import { liveDB } from '../../../'

export default liveDB.model<WatcherIDN.InitialData>(
  'IDN_Temp',
  new Schema<WatcherIDN.InitialData>({
    botId: {
      type: String,
      required: true,
    },
    data: {
      user: {
        id: String,
        name: String,
        username: String,
        avatar: String,
        color_code: String,
      },
      image: String,
      title: String,
      slug: String,
      view_count: Number,
      live_at: String,
      stream_url: String,
      chat_room_id: String,
      room_identifier: String,
      showroom_id: Number,
    },
    data_id: {
      type: String,
      required: true,
    },
    room_identifier: {
      type: String,
      required: true,
    },
    activeUsers: {
      type: [String],
    },
    viewers: {
      active: {
        type: Number,
        default: 0,
      },
      last: {
        type: Number,
        default: 0,
      },
      peak: {
        type: Number,
        index: true,
        default: 0,
      },
      is_excitement: Boolean,
    },
    comments: {
      required: true,
      type: [{
        _id: false,
        user: {
          id: String,
          name: String,
          username: String,
          avatar: String,
          color_code: String,
        },
        chat: {
          pinned: Boolean,
          message: String,
        },
        time: Date,
      }],
    },
    giftList: [
      {
        _id: false,
        icon: Boolean,
        is_hidden: Boolean,
        order_no: Number,
        gift_type: Number,
        image: String,
        gift_id: Number,
        image2: String,
        free: Boolean,
        point: Number,
        is_delete_from_stage: Boolean,
        gift_name: String,
        scale: Number,
        label: Boolean,
        dialog_id: Number,
      },
    ],
    giftLog: [
      {
        _id: false,
        user: {
          id: String,
          name: String,
          username: String,
          avatar: String,
        },
        gift: {
          name: String,
          slug: String,
          gold: Number,
          point: Number,
          image_url: String,
          animation_large: String,
          animation_small: String,
          bg_color: String,
          exp: Number,
          theme: {
            name: String,
            slug: String,
          },
        },
        time: Date,
      },
    ],
    users: [
      {
        _id: false,
        id: String,
        name: Number,
        username: String,
        avatar: String,
        color_code: String,
        gold: Number,
        point: Number,
        last_seen: String,
      },
    ],
    screenshots: {
      folder: String,
      format: String,
      list: [String],
    },
    messages: [
      {
        _id: false,
        channelId: String,
        messageId: String,
      },
    ],
    initialComment: {
      num: Number,
      users: Number,
    },
    recordDates: [
      {
        _id: false,
        from: {
          type: Date,
          default: () => Date.now(),
        },
        to: {
          type: Date,
          default: () => Date.now(),
        },
      },
    ],
    goldRate: Number,
    startedAt: {
      type: Number,
      required: true,
    },
  }),
)
