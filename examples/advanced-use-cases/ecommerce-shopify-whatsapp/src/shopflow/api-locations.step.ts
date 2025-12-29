/**
 * Locations API Step
 * REST API for Shopify location management
 */

import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/error-handler.middleware';
import { ShopifyService } from '../services/shopify.service';

const locationResponseSchema = z.object({
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    isActive: z.boolean(),
  })),
  count: z.number(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetLocations',
  description: 'Retrieves locations from Shopify',
  path: '/shopify/locations',
  method: 'GET',
  emits: [],
  flows: ['shopflow'],
  middleware: [errorHandlerMiddleware],
  responseSchema: {
    200: locationResponseSchema,
    500: z.object({ error: z.string() }),
  },
};

export const handler: Handlers['GetLocations'] = async (req, { logger }) => {
  logger.info('Fetching locations from Shopify');

  try {
    const locations = await ShopifyService.getLocations();

    const formattedLocations = locations.map(l => ({
      id: l.id,
      name: l.name,
      address: `${l.address.address1}, ${l.address.city}, ${l.address.province} ${l.address.zip}, ${l.address.country}`,
      isActive: l.isActive,
    }));

    return {
      status: 200,
      body: {
        locations: formattedLocations,
        count: formattedLocations.length,
      },
    };
  } catch (error) {
    logger.error('Error fetching locations', { error: String(error) });
    return {
      status: 500,
      body: { error: 'Failed to fetch locations' },
    };
  }
};

