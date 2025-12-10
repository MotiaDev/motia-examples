import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import axios from 'axios'

const token = process.env.WHATSAPP_TOKEN!
const phoneNumberId = process.env.PHONE_NUMBER_ID!
const userPhone = process.env.RECEIVER_PHONE!

const schema = z.object({
  message: z.string(),        
  user: z.string().optional()  
})

export const config: EventConfig = {
  type: 'event',
  name: 'send-whatsapp-message',
  description: 'Send a WhatsApp message via Cloud API (event-driven)',
  subscribes: ['send-whatsapp-message-request'], 
  emits: [],
  input: schema,
  flows: ['health-companion']
}

export const handler: Handlers['send-whatsapp-message'] = async (input, { logger }) => {
  const { message, user } = input

  logger.debug('Send WhatsApp event input:', input)

  if (!message || typeof message !== 'string') {
    logger.warn('Invalid or empty message received.')
    return
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: user || userPhone, 
    text: { body: message }
  }

  logger.debug('Payload to WhatsApp API:', payload)

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      { headers }
    )

    logger.info(`WhatsApp message sent to ${payload.to}: ${response.status}`)
    logger.debug('WhatsApp API Response:', response.data)
  } catch (error: any) {
    const errRes = error.response?.data || error.message
    logger.error('WhatsApp Send Error:', errRes)
    logger.debug('Full error object:', error)
  }
}
