import Redis from 'ioredis'

const client = new Redis(process.env.REDIS_URI ?? '')

client.on('error', err => console.log('Redis Client Error', err))
client.on('connect', () => console.log('Connected to Redis'))
/**
 * The above function is an asynchronous function that attempts to connect to a client and logs any
 * errors that occur.
 */
// export async function connect() {
//   try {
//     await client.connect()
//   }
//   catch (e) {
//     console.log(e)
//   }
// }

export default client
