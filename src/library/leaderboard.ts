import { ofetch } from 'ofetch'

export async function getLeaderboard() {
  return await ofetch('https://backend.saweria.co/widgets/leaderboard/all', {
    headers: {
      'Stream-Key': process.env.SAWERIA_KEY ?? '',
    },
  })
}
