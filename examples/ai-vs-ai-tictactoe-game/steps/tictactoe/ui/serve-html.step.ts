import { ApiRouteConfig } from 'motia'
import * as fs from 'fs'
import * as path from 'path'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ServeGameHTML',
  description: 'Serve game HTML',
  path: '/game',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-ui']
}

export const handler = async () => {
  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf-8')
    return { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }, body: html }
  } catch {
    return { status: 500, headers: { 'Content-Type': 'text/html' }, body: '<h1>Error loading game</h1>' }
  }
}
