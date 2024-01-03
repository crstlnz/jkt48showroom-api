import { Schema } from 'mongoose'
import { liveDB } from '../../'

export const Saweria = liveDB.model('Saweria', new Schema({}, { strict: false }))
