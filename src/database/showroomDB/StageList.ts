import { Schema } from 'mongoose'
import { jkt48DB } from '..'

const stageListSchema = new Schema<Database.IStageListItem>({
  data_id: {
    type: String,
    unique: true,
  },
  stage_list: {
    type: [
      {
        _id: false,
        date: Date,
        list: [Number],
      },
    ],
    default: [],
  },
})

const StageList = jkt48DB.model('StageList', stageListSchema)
export { StageList }
