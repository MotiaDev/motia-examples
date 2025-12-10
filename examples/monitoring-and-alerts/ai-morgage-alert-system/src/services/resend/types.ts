export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailOptions {
  from: string
  to: string[]
  subject: string
  html: string
  replyTo?: string
}

export interface ResendResponse {
  id: string
}

export interface ResendError {
  message: string
  name: string
}

