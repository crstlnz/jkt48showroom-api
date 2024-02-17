import { Schema } from 'mongoose'
import { liveDB } from '../../'

export default liveDB.model('Stats', new Schema({}, { strict: false }))
