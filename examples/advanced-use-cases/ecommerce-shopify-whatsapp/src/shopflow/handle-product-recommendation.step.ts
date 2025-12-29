/**
 * Handle Product Recommendation Event Step
 * Uses Shopify inventory + Gemini AI for personalized product recommendations
 */

import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { ShopifyService } from '../services/shopify.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { GeminiService, ProductContext } from '../services/gemini.service';

const inputSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  customerName: z.string(),
  waId: z.string(),
  content: z.string(),
  phoneNumberId: z.string(),
  customerId: z.string().optional(),
  entities: z.object({
    productName: z.string().optional(),
    productCategory: z.string().optional(),
  }).optional(),
  sentiment: z.string().optional(),
  confidence: z.number().optional(),
  intent: z.string().optional(),
  action: z.string().optional(),
  productId: z.string().optional(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'HandleProductRecommendation',
  description: 'Generates personalized product recommendations using Shopify + Gemini',
  subscribes: ['shopflow.intent.product_recommendation'],
  emits: [
    { topic: 'shopflow.response.sent', label: 'Response Sent' },
  ],
  flows: ['shopflow'],
  input: inputSchema,
};

export const handler: Handlers['HandleProductRecommendation'] = async (input, { emit, logger, state }) => {
  const {
    from,
    customerName,
    waId,
    content,
    entities,
    productId,
    customerId,
  } = input;

  logger.info('Handling product recommendation', { from, entities, productId });

  try {
    // If specific product requested (from button click)
    if (productId) {
      const product = await ShopifyService.getProductById(productId);
      
      if (product) {
        const priceRange = product.priceRange;
        const minPrice = WhatsAppService.formatCurrency(priceRange.minVariantPrice.amount);
        const maxPrice = WhatsAppService.formatCurrency(priceRange.maxVariantPrice.amount);
        const priceDisplay = minPrice === maxPrice ? minPrice : `${minPrice} - ${maxPrice}`;

        let message = `*${product.title}*\n\n`;
        message += product.description 
          ? `${product.description.substring(0, 300)}${product.description.length > 300 ? '...' : ''}\n\n`
          : '';
        message += `💰 *Price:* ${priceDisplay}\n`;
        message += `📦 *Availability:* ${product.totalInventory > 0 ? `${product.totalInventory} in stock` : 'Out of stock'}\n`;

        // Send product image if available
        if (product.featuredImage?.url) {
          await WhatsAppService.sendImageMessage(from, product.featuredImage.url, message);
        } else {
          await WhatsAppService.sendTextMessage(from, message);
        }

        // Add action buttons
        await WhatsAppService.sendButtonMessage(
          from,
          'Would you like to purchase this item?',
          [
            { id: `buy_${productId}`, title: '🛒 Add to Cart' },
            { id: 'browse_more', title: '🔍 Browse More' },
          ]
        );

        await emit({
          topic: 'shopflow.response.sent',
          data: { waId, responseType: 'product_detail', productId },
        });
        return;
      }
    }

    // Build search query from entities or content
    let searchQuery = '';
    if (entities?.productName) {
      searchQuery = entities.productName;
    } else if (entities?.productCategory) {
      searchQuery = `product_type:${entities.productCategory}`;
    }

    // Fetch products from Shopify
    const products = await ShopifyService.getProducts(10, searchQuery || undefined);

    if (products.length === 0) {
      await WhatsAppService.sendTextMessage(
        from,
        `Hi ${customerName}! 👋\n\nI couldn't find any products matching your request. Could you tell me more about what you're looking for?\n\n💡 *Try describing:*\n• The type of product\n• Features you need\n• Your budget range`
      );

      await emit({
        topic: 'shopflow.response.sent',
        data: { waId, responseType: 'no_products_found' },
      });
      return;
    }

    // Get customer purchase history for personalization
    let purchaseHistory: string[] = [];
    if (customerId) {
      try {
        const orders = await ShopifyService.getOrdersByPhone(from);
        purchaseHistory = orders
          .flatMap(o => o.lineItems.edges.map(e => e.node.title))
          .slice(0, 10);
      } catch {
        // Continue without purchase history
      }
    }

    // Prepare product context for Gemini
    const productContexts: ProductContext[] = products.map(p => ({
      title: p.title,
      description: p.description || '',
      price: WhatsAppService.formatCurrency(p.priceRange.minVariantPrice.amount),
      productType: p.productType || 'General',
      available: p.totalInventory > 0,
      imageUrl: p.featuredImage?.url,
    }));

    // Generate AI recommendation
    const response = await GeminiService.generateProductRecommendation(
      customerName,
      content,
      productContexts,
      purchaseHistory
    );

    // Send recommendation text
    await WhatsAppService.sendTextMessage(from, response);

    // Send interactive product list
    const sections = [{
      title: 'Recommended Products',
      rows: products.slice(0, 10).map(p => ({
        id: `product_${p.id.replace('gid://shopify/Product/', '')}`,
        title: p.title.substring(0, 24),
        description: `${WhatsAppService.formatCurrency(p.priceRange.minVariantPrice.amount)} - ${p.totalInventory > 0 ? 'In Stock' : 'Out of Stock'}`,
      })),
    }];

    await WhatsAppService.sendListMessage(
      from,
      '🛍️ Products for You',
      'Tap below to see more details on any product',
      'View Products',
      sections
    );

    // Store in conversation history
    const conversationKey = `conversation_${waId}`;
    const existing = await state.get<{
      messages: Array<{ role: string; content: string; timestamp: string }>;
    }>('shopflow', conversationKey);

    if (existing) {
      existing.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });
      await state.set('shopflow', conversationKey, existing);
    }

    await emit({
      topic: 'shopflow.response.sent',
      data: {
        waId,
        responseType: 'product_recommendation',
        productCount: products.length,
      },
    });

    logger.info('Product recommendations sent', { productCount: products.length });
  } catch (error) {
    logger.error('Error handling product recommendation', { error: String(error) });

    await WhatsAppService.sendTextMessage(
      from,
      `Hi ${customerName}! I'm having a bit of trouble right now. Could you try asking again, or would you like to browse our store directly? 🛍️`
    );

    await emit({
      topic: 'shopflow.response.sent',
      data: { waId, responseType: 'error' },
    });
  }
};

