import { ApiRouteConfig } from 'motia'
import * as fs from 'fs'
import * as path from 'path'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ServeGameCSS',
  description: 'Serve game CSS',
  path: '/game/styles.css',
  method: 'GET',
  emits: [],
  flows: ['tictactoe-ui']
}

export const handler = async () => {
  try {
    const css = fs.readFileSync(path.join(process.cwd(), 'public', 'styles.css'), 'utf-8')
    return { status: 200, headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }, body: css }
  } catch {
    return { status: 500, headers: { 'Content-Type': 'text/css' }, body: '' }
  }
}
