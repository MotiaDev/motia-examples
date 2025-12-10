import { env } from "./env";

export const appConfig = {
  discord: {
    webhookUrl: env.DISCORD_WEBHOOK_URL
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    topicName: env.GOOGLE_PUBSUB_TOPIC
  },
  autoResponder: {
    name: env.AUTO_RESPONDER_NAME,
    email: env.AUTO_RESPONDER_EMAIL
  }
}
  