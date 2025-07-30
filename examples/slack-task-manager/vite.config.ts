import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['b584-14-195-204-38.ngrok-free.app'],
    fs: {
      allow: [
        '/Users/swarnabhasinha/WebstormProjects/demo/slack-example/node_modules',
        '/Users/swarnabhasinha/WebstormProjects/demo/slack-example/steps',
        '/Users/swarnabhasinha/WebstormProjects/demo/slack-example/node_modules/.pnpm',
      ],
    },
  },
}); 