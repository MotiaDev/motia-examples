import { NextRequest, NextResponse } from 'next/server'

const MOTIA_URL = process.env.MOTIA_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const response = await fetch(`${MOTIA_URL}/cursor/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

