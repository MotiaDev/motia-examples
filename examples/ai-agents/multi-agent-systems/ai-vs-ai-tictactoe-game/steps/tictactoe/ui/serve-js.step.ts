import { ApiRouteConfig } from 'motia'
import * as fs from 'fs'
import * as path from 'path'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ServeGameJS',
  description: 'Serve game JavaScript',
  path: '/game/app.js',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-ui']
}

export const handler = async () => {
  try {
    const js = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf-8')
    return { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }, body: js }
  } catch {
    return { status: 500, headers: { 'Content-Type': 'application/javascript' }, body: '' }
  }
}
