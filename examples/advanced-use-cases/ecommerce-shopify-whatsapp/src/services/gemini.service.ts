/**
 * Gemini AI Service
 * Handles intent classification and response generation for ShopFlow
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const requestBody: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

// ============ INTENT CLASSIFICATION ============

export type CustomerIntent =
  | 'order_status'
  | 'order_tracking'
  | 'product_recommendation'
  | 'product_search'
  | 'cart_recovery'
  | 'discount_code'
  | 'refund_request'
  | 'shipping_update'
  | 'general_support'
  | 'greeting'
  | 'unknown';

export interface IntentClassification {
  intent: CustomerIntent;
  confidence: number;
  entities: {
    orderNumber?: string;
    productName?: string;
    productCategory?: string;
    discountCode?: string;
    email?: string;
    amount?: string;
  };
  requiresEscalation: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export async function classifyIntent(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<IntentClassification> {
  const systemPrompt = `You are an e-commerce customer support intent classifier for ShopFlow.
Analyze the customer message and return a JSON response with the following structure:

{
  "intent": one of ["order_status", "order_tracking", "product_recommendation", "product_search", "cart_recovery", "discount_code", "refund_request", "shipping_update", "general_support", "greeting", "unknown"],
  "confidence": number between 0 and 1,
  "entities": {
    "orderNumber": extracted order number if mentioned (e.g., "#1234", "order 1234"),
    "productName": product name if mentioned,
    "productCategory": product category if mentioned,
    "discountCode": discount code if mentioned,
    "email": email if mentioned,
    "amount": monetary amount if mentioned
  },
  "requiresEscalation": boolean - true if message shows frustration, legal threats, or complex issues requiring human intervention,
  "sentiment": one of ["positive", "neutral", "negative"]
}

Intent definitions:
- order_status: Customer asking about their order status, when it will arrive
- order_tracking: Customer wants tracking information, tracking number
- product_recommendation: Customer wants product suggestions based on preferences or past purchases
- product_search: Customer looking for a specific product or category
- cart_recovery: Customer mentions abandoned cart, incomplete checkout
- discount_code: Customer asking about discounts, promotions, or trying to apply a code
- refund_request: Customer wants to return, refund, or cancel an order
- shipping_update: Questions about shipping costs, methods, or delivery times
- general_support: General questions not fitting other categories
- greeting: Simple greetings like "hi", "hello"
- unknown: Cannot determine intent

ONLY return the JSON, no other text.`;

  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = historyText
    ? `Previous conversation:\n${historyText}\n\nCurrent message: ${message}`
    : message;

  try {
    const response = await callGemini(prompt, systemPrompt);
    
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const result = JSON.parse(jsonStr);
    
    return {
      intent: result.intent || 'unknown',
      confidence: result.confidence || 0.5,
      entities: result.entities || {},
      requiresEscalation: result.requiresEscalation || false,
      sentiment: result.sentiment || 'neutral',
    };
  } catch (error) {
    console.error('Intent classification error:', error);
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {},
      requiresEscalation: false,
      sentiment: 'neutral',
    };
  }
}

// ============ RESPONSE GENERATION ============

export interface OrderContext {
  orderName: string;
  status: string;
  fulfillmentStatus: string;
  totalPrice: string;
  items: Array<{ title: string; quantity: number }>;
  trackingInfo?: Array<{ number: string; company: string; url?: string }>;
  shippingAddress?: string;
  createdAt: string;
}

export async function generateOrderStatusResponse(
  customerName: string,
  orders: OrderContext[]
): Promise<string> {
  const systemPrompt = `You are a friendly, professional e-commerce customer support assistant for ShopFlow.
Generate a helpful, conversational response about the customer's order status.
Keep responses concise (under 300 words) and use emojis sparingly for a friendly tone.
Always be empathetic and helpful. Format the response nicely for WhatsApp (use *bold* for emphasis).`;

  const orderDetails = orders.map(order => `
Order ${order.orderName}:
- Status: ${order.status}
- Fulfillment: ${order.fulfillmentStatus}
- Total: ${order.totalPrice}
- Items: ${order.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}
- Ordered: ${order.createdAt}
${order.trackingInfo ? `- Tracking: ${order.trackingInfo.map(t => `${t.company}: ${t.number}`).join(', ')}` : ''}
`).join('\n');

  const prompt = `Customer "${customerName}" is asking about their order(s).

Order Information:
${orderDetails}

Generate a friendly, helpful response about their order status. Include tracking links if available.`;

  return callGemini(prompt, systemPrompt);
}

export interface ProductContext {
  title: string;
  description: string;
  price: string;
  productType: string;
  available: boolean;
  imageUrl?: string;
}

export async function generateProductRecommendation(
  customerName: string,
  query: string,
  products: ProductContext[],
  purchaseHistory?: string[]
): Promise<string> {
  const systemPrompt = `You are a helpful e-commerce shopping assistant for ShopFlow.
Generate personalized product recommendations based on the customer's query and available products.
Keep responses conversational, friendly, and under 350 words.
Use emojis sparingly and format for WhatsApp (*bold*, _italic_).
Focus on 2-3 top recommendations with brief explanations of why they'd be a good fit.`;

  const productList = products.map(p => `
- ${p.title} (${p.price})
  Type: ${p.productType}
  ${p.description ? `Description: ${p.description.substring(0, 100)}...` : ''}
  In Stock: ${p.available ? 'Yes' : 'No'}
`).join('');

  const historyContext = purchaseHistory && purchaseHistory.length > 0
    ? `\nPrevious purchases: ${purchaseHistory.join(', ')}`
    : '';

  const prompt = `Customer "${customerName}" is looking for: "${query}"
${historyContext}

Available products that might match:
${productList}

Generate a personalized recommendation response. Highlight the best options and explain why they're a good fit.`;

  return callGemini(prompt, systemPrompt);
}

export async function generateAbandonedCartMessage(
  customerName: string,
  cartItems: Array<{ title: string; quantity: number; price: string }>,
  cartTotal: string,
  discountCode?: string
): Promise<string> {
  const systemPrompt = `You are a friendly e-commerce assistant for ShopFlow.
Generate a warm, non-pushy message to remind the customer about their abandoned cart.
Keep it brief (under 150 words), friendly, and helpful.
Use emojis sparingly. Format for WhatsApp.
Don't be aggressive or use pressure tactics.`;

  const items = cartItems.map(i => `${i.quantity}x ${i.title} - ${i.price}`).join('\n');

  const prompt = `Customer "${customerName}" left items in their cart:
${items}

Cart Total: ${cartTotal}
${discountCode ? `Available discount code: ${discountCode}` : ''}

Generate a friendly reminder message that's helpful, not pushy.`;

  return callGemini(prompt, systemPrompt);
}

export async function generateGeneralResponse(
  customerName: string,
  message: string,
  context: string = ''
): Promise<string> {
  const systemPrompt = `You are a helpful, friendly e-commerce customer support assistant for ShopFlow.
Provide concise, helpful responses to customer inquiries.
Keep responses under 200 words. Use emojis sparingly.
Format for WhatsApp (*bold*, _italic_).
If you can't help with something, politely explain and offer to connect them with a human agent.`;

  const prompt = `Customer "${customerName}" says: "${message}"
${context ? `\nContext: ${context}` : ''}

Generate a helpful response.`;

  return callGemini(prompt, systemPrompt);
}

// ============ VALIDATION & REASONING ============

export async function validateRefundRequest(
  orderId: string,
  orderDate: string,
  reason: string,
  orderTotal: string
): Promise<{ approved: boolean; reason: string; needsHumanReview: boolean }> {
  const systemPrompt = `You are an e-commerce refund validation system.
Analyze refund requests and determine if they can be auto-approved, rejected, or need human review.

Return JSON only:
{
  "approved": boolean,
  "reason": string explanation,
  "needsHumanReview": boolean - true if complex case requiring human decision
}

Auto-approve if: within 30 days, clear reason, reasonable request
Auto-reject if: beyond 90 days, fraudulent indicators
Human review if: high value (>$200), vague reason, repeat refund requester`;

  const prompt = `Refund Request:
- Order ID: ${orderId}
- Order Date: ${orderDate}
- Order Total: ${orderTotal}
- Customer Reason: ${reason}

Current Date: ${new Date().toISOString().split('T')[0]}

Analyze and return JSON decision.`;

  try {
    const response = await callGemini(prompt, systemPrompt);
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    return JSON.parse(jsonStr);
  } catch {
    return {
      approved: false,
      reason: 'Unable to process automatically',
      needsHumanReview: true,
    };
  }
}

// Export service object
export const GeminiService = {
  classifyIntent,
  generateOrderStatusResponse,
  generateProductRecommendation,
  generateAbandonedCartMessage,
  generateGeneralResponse,
  validateRefundRequest,
};

export default GeminiService;

