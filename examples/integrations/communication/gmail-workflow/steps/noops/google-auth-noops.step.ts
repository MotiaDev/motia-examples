import {NoopConfig} from 'motia'

export const config: NoopConfig = {
  type: 'noop',
  name: 'Google Auth',
  description: 'Fetches tokens from Google',
  virtualSubscribes: ['gmail.auth', 'gmail.auth-url', 'gmail.watch', 'gmail.token.status'],
  virtualEmits: ['gmail.auth'],
  flows: ['gmail-flow'],
} 
