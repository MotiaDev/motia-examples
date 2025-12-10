import { EmailOptions, ResendResponse } from './types'

export async function sendEmail(
  options: EmailOptions,
  apiKey: string
): Promise<ResendResponse> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(options)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json() as ResendResponse
  return data
}

