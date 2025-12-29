/**
 * Shopify GraphQL Service
 * Handles all Shopify Admin API interactions for ShopFlow
 */

const STORE = process.env.SHOPIFY_STORE;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const GRAPHQL_URL = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}

async function shopifyGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Shopify GraphQL Error: ${json.errors.map(e => e.message).join(', ')}`);
  }

  return json.data!;
}

// ============ PRODUCTS ============

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  status: string;
  totalInventory: number;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage?: {
    url: string;
    altText?: string;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        inventoryQuantity: number;
        sku?: string;
      };
    }>;
  };
}

export async function getProducts(first: number = 10, query?: string): Promise<ShopifyProduct[]> {
  const gqlQuery = `
    query GetProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            description
            handle
            productType
            status
            totalInventory
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            featuredImage { url altText }
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity
                  sku
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(
    gqlQuery,
    { first, query }
  );

  return data.products.edges.map(edge => edge.node);
}

export async function getProductById(id: string): Promise<ShopifyProduct | null> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        description
        handle
        productType
        status
        totalInventory
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        featuredImage { url altText }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              inventoryQuantity
              sku
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ product: ShopifyProduct | null }>(query, { id: gid });
  return data.product;
}

// ============ ORDERS ============

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPrice: string;
  subtotalPrice: string;
  totalShippingPrice: string;
  currencyCode: string;
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        variant?: {
          title: string;
          sku?: string;
          price: string;
        };
      };
    }>;
  };
  fulfillments: Array<{
    status: string;
    trackingInfo: Array<{
      number: string;
      url?: string;
      company: string;
    }>;
    createdAt: string;
  }>;
}

export async function getOrders(first: number = 10, query?: string): Promise<ShopifyOrder[]> {
  const gqlQuery = `
    query GetOrders($first: Int!, $query: String) {
      orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            currentTotalPriceSet { shopMoney { amount currencyCode } }
            currentSubtotalPriceSet { shopMoney { amount currencyCode } }
            currentShippingPriceSet { shopMoney { amount currencyCode } }
            currencyCode
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  variant { title sku price }
                }
              }
            }
            fulfillments(first: 5) {
              status
              trackingInfo { number url company }
              createdAt
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(
    gqlQuery,
    { first, query }
  );

  return data.orders.edges.map(edge => {
    const node = edge.node as unknown as {
      currentTotalPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
      currentSubtotalPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
      currentShippingPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
    } & Omit<ShopifyOrder, 'totalPrice' | 'subtotalPrice' | 'totalShippingPrice'>;

    return {
      ...edge.node,
      totalPrice: node.currentTotalPriceSet?.shopMoney?.amount || '0',
      subtotalPrice: node.currentSubtotalPriceSet?.shopMoney?.amount || '0',
      totalShippingPrice: node.currentShippingPriceSet?.shopMoney?.amount || '0',
    } as ShopifyOrder;
  });
}

export async function getOrderById(id: string): Promise<ShopifyOrder | null> {
  const gid = id.startsWith('gid://') ? id : `gid://shopify/Order/${id}`;

  const query = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        currentSubtotalPriceSet { shopMoney { amount currencyCode } }
        currentShippingPriceSet { shopMoney { amount currencyCode } }
        currencyCode
        lineItems(first: 20) {
          edges {
            node {
              title
              quantity
              variant { title sku price }
            }
          }
        }
        fulfillments(first: 5) {
          status
          trackingInfo { number url company }
          createdAt
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ order: unknown }>(query, { id: gid });
  if (!data.order) return null;

  const order = data.order as {
    currentTotalPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
    currentSubtotalPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
    currentShippingPriceSet?: { shopMoney: { amount: string; currencyCode: string } };
  } & Omit<ShopifyOrder, 'totalPrice' | 'subtotalPrice' | 'totalShippingPrice'>;

  return {
    ...order,
    totalPrice: order.currentTotalPriceSet?.shopMoney?.amount || '0',
    subtotalPrice: order.currentSubtotalPriceSet?.shopMoney?.amount || '0',
    totalShippingPrice: order.currentShippingPriceSet?.shopMoney?.amount || '0',
  } as ShopifyOrder;
}

export async function getOrdersByEmail(email: string): Promise<ShopifyOrder[]> {
  return getOrders(10, `email:${email}`);
}

export async function getOrdersByPhone(phone: string): Promise<ShopifyOrder[]> {
  // Normalize phone number
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  return getOrders(10, `phone:${normalizedPhone}`);
}

// ============ CUSTOMERS ============

export interface ShopifyCustomer {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  numberOfOrders: string;
  tags: string[];
  createdAt: string;
  lastOrder?: {
    id: string;
    name: string;
    createdAt: string;
  };
}

export async function getCustomerByPhone(phone: string): Promise<ShopifyCustomer | null> {
  try {
    const normalizedPhone = phone.replace(/[^\d+]/g, '');

    const query = `
      query GetCustomerByPhone($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              displayName
              numberOfOrders
              tags
              createdAt
              lastOrder {
                id
                name
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await shopifyGraphQL<{ customers: { edges: Array<{ node: ShopifyCustomer }> } }>(
      query,
      { query: `phone:${normalizedPhone}` }
    );

    return data.customers.edges[0]?.node ?? null;
  } catch (error) {
    // Gracefully fail if read_customers scope is missing
    console.warn('Customer lookup failed (missing read_customers scope?):', error);
    return null;
  }
}

export async function getCustomerByEmail(email: string): Promise<ShopifyCustomer | null> {
  try {
    const query = `
      query GetCustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              displayName
              numberOfOrders
              tags
              createdAt
              lastOrder {
                id
                name
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await shopifyGraphQL<{ customers: { edges: Array<{ node: ShopifyCustomer }> } }>(
      query,
      { query: `email:${email}` }
    );

    return data.customers.edges[0]?.node ?? null;
  } catch (error) {
    // Gracefully fail if read_customers scope is missing
    console.warn('Customer lookup failed (missing read_customers scope?):', error);
    return null;
  }
}

// ============ LOCATIONS ============

export interface ShopifyLocation {
  id: string;
  name: string;
  address: {
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  isActive: boolean;
}

export async function getLocations(): Promise<ShopifyLocation[]> {
  const query = `
    query GetLocations {
      locations(first: 10) {
        edges {
          node {
            id
            name
            address {
              address1
              city
              province
              country
              zip
            }
            isActive
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ locations: { edges: Array<{ node: ShopifyLocation }> } }>(query);
  return data.locations.edges.map(edge => edge.node);
}

// ============ DRAFT ORDERS ============

export interface ShopifyDraftOrder {
  id: string;
  name: string;
  status: string;
  totalPrice: string;
  createdAt: string;
  customer?: {
    id: string;
    email?: string;
    displayName: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        originalTotal: string;
      };
    }>;
  };
}

export async function listDraftOrders(first: number = 10): Promise<ShopifyDraftOrder[]> {
  const query = `
    query ListDraftOrders($first: Int!) {
      draftOrders(first: $first, reverse: true) {
        edges {
          node {
            id
            name
            status
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  originalTotalSet { shopMoney { amount currencyCode } }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{ 
    draftOrders: { 
      edges: Array<{ 
        node: {
          id: string;
          name: string;
          status: string;
          totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
          createdAt: string;
          lineItems: { edges: Array<{ node: { title: string; quantity: number; originalTotalSet: { shopMoney: { amount: string } } } }> };
        }
      }> 
    } 
  }>(query, { first });

  return data.draftOrders.edges.map(edge => ({
    id: edge.node.id,
    name: edge.node.name,
    status: edge.node.status,
    totalPrice: edge.node.totalPriceSet.shopMoney.amount,
    createdAt: edge.node.createdAt,
    lineItems: {
      edges: edge.node.lineItems.edges.map(li => ({
        node: {
          title: li.node.title,
          quantity: li.node.quantity,
          originalTotal: li.node.originalTotalSet.shopMoney.amount,
        }
      }))
    }
  }));
}

export interface CreateDraftOrderInput {
  email: string;
  lineItems: Array<{
    variantId: string;
    quantity: number;
  }>;
  note?: string;
  shippingAddress?: {
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    firstName: string;
    lastName: string;
  };
}

export async function createDraftOrder(input: CreateDraftOrderInput): Promise<ShopifyDraftOrder> {
  const mutation = `
    mutation CreateDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          status
          totalPriceSet { shopMoney { amount currencyCode } }
          createdAt
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                originalTotalSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const draftOrderInput = {
    email: input.email,
    lineItems: input.lineItems.map(item => ({
      variantId: item.variantId.startsWith('gid://') 
        ? item.variantId 
        : `gid://shopify/ProductVariant/${item.variantId}`,
      quantity: item.quantity,
    })),
    note: input.note,
    shippingAddress: input.shippingAddress,
  };

  const data = await shopifyGraphQL<{
    draftOrderCreate: {
      draftOrder: {
        id: string;
        name: string;
        status: string;
        totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
        createdAt: string;
        lineItems: { edges: Array<{ node: { title: string; quantity: number; originalTotalSet: { shopMoney: { amount: string } } } }> };
      };
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(mutation, { input: draftOrderInput });

  if (data.draftOrderCreate.userErrors.length > 0) {
    throw new Error(`Draft order creation failed: ${data.draftOrderCreate.userErrors.map(e => e.message).join(', ')}`);
  }

  const draftOrder = data.draftOrderCreate.draftOrder;
  return {
    id: draftOrder.id,
    name: draftOrder.name,
    status: draftOrder.status,
    totalPrice: draftOrder.totalPriceSet.shopMoney.amount,
    createdAt: draftOrder.createdAt,
    lineItems: {
      edges: draftOrder.lineItems.edges.map(li => ({
        node: {
          title: li.node.title,
          quantity: li.node.quantity,
          originalTotal: li.node.originalTotalSet.shopMoney.amount,
        }
      }))
    }
  };
}

export async function completeDraftOrder(draftOrderId: string): Promise<{
  draftOrder: ShopifyDraftOrder;
  order?: { id: string; name: string };
}> {
  const gid = draftOrderId.startsWith('gid://') 
    ? draftOrderId 
    : `gid://shopify/DraftOrder/${draftOrderId}`;

  const mutation = `
    mutation CompleteDraftOrder($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder {
          id
          name
          status
          totalPriceSet { shopMoney { amount currencyCode } }
          createdAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{
    draftOrderComplete: {
      draftOrder: {
        id: string;
        name: string;
        status: string;
        totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
        createdAt: string;
      };
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(mutation, { id: gid });

  if (data.draftOrderComplete.userErrors.length > 0) {
    throw new Error(`Draft order completion failed: ${data.draftOrderComplete.userErrors.map(e => e.message).join(', ')}`);
  }

  const draftOrder = data.draftOrderComplete.draftOrder;
  return {
    draftOrder: {
      id: draftOrder.id,
      name: draftOrder.name,
      status: draftOrder.status,
      totalPrice: draftOrder.totalPriceSet.shopMoney.amount,
      createdAt: draftOrder.createdAt,
      lineItems: { edges: [] },
    },
  };
}

// ============ INVENTORY ============

export async function getInventoryLevels(locationId: string, variantIds: string[]): Promise<Array<{
  variantId: string;
  available: number;
  locationId: string;
}>> {
  const gids = variantIds.map(id => 
    id.startsWith('gid://') ? id : `gid://shopify/ProductVariant/${id}`
  );

  const query = `
    query GetInventoryLevels($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          inventoryItem {
            inventoryLevels(first: 10) {
              edges {
                node {
                  location { id }
                  quantities(names: ["available"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  interface InventoryData {
    nodes: Array<{
      id: string;
      inventoryItem: {
        inventoryLevels: {
          edges: Array<{
            node: {
              location: { id: string };
              quantities: Array<{ name: string; quantity: number }>;
            };
          }>;
        };
      };
    }>;
  }

  const data = await shopifyGraphQL<InventoryData>(query, { ids: gids });

  const results: Array<{ variantId: string; available: number; locationId: string }> = [];

  for (const node of data.nodes) {
    if (!node?.inventoryItem) continue;
    for (const level of node.inventoryItem.inventoryLevels.edges) {
      const availableQty = level.node.quantities.find(q => q.name === 'available');
      if (level.node.location.id === locationId || !locationId) {
        results.push({
          variantId: node.id,
          locationId: level.node.location.id,
          available: availableQty?.quantity ?? 0,
        });
      }
    }
  }

  return results;
}

// Export service object for convenience
export const ShopifyService = {
  getProducts,
  getProductById,
  getOrders,
  getOrderById,
  getOrdersByEmail,
  getOrdersByPhone,
  getCustomerByPhone,
  getCustomerByEmail,
  getLocations,
  listDraftOrders,
  createDraftOrder,
  completeDraftOrder,
  getInventoryLevels,
};

export default ShopifyService;

