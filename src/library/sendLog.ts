import { ofetch } from 'ofetch'

const webhookUrl = process.env.DISCORD_WEBHOOK!

export async function sendLog(message: string) {
  await ofetch(webhookUrl, {
    method: 'POST',
    body: {
      content: message,
    },
  })
}
