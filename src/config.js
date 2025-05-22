require('dotenv').config();

const config = {
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || 'your_api_key',
    apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY || 'your_api_secret_key',
    scopes: [
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory',
      'read_orders',
      'write_orders'
    ],
    hostName: process.env.SHOPIFY_HOST_NAME || 'your-store.myshopify.com',
    apiVersion: '2023-10' // Update to the latest stable version
  },
  app: {
    port: process.env.PORT || 3000,
    webhookPath: '/webhooks',
    cartApiPath: '/api/cart'
  }
};

module.exports = config;
