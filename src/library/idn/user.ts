import type { Context } from 'hono'
import { ofetch } from 'ofetch'

export default async function getIDNUser(c: Context) {
  const userId = c.req.query('user_id')
  const res = await ofetch('https://api.idn.app/graphql', {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      query: `query GetPublicProfile { getPublicProfile(uuid: "${userId}") { uuid username name avatar bio_description following_count follower_count is_follow }}`,

    }),
  })

  return res
}
