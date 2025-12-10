import { cleanEnv, str } from 'envalid'

export const env = cleanEnv(process.env, {
  DISCORD_WEBHOOK_URL: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_REDIRECT_URI: str({ devDefault: 'http://localhost:3000/api/auth/callback' }),
  GOOGLE_PUBSUB_TOPIC: str(),
  AUTO_RESPONDER_NAME: str(),
  AUTO_RESPONDER_EMAIL: str(),
})
