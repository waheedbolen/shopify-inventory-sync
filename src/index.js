// Main application entry point
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2025-04');
const { NodeAdapter } = require('@shopify/shopify-api/adapters/node');
const config = require('./config');
const webhookHandlers = require('./webhookHandlers');
const inventoryService = require('./inventoryService');
const productService = require('./productService');
const verifyShopifyWebhook = require('./verifyShopifyWebhook'); // Added import

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
// app.use(bodyParser.json()); // Removed global JSON parser

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: config.shopify.apiKey,
  apiSecretKey: config.shopify.apiSecretKey,
  scopes: config.shopify.scopes,
  hostName: config.shopify.hostName,
  apiVersion: config.shopify.apiVersion || LATEST_API_VERSION,
  isEmbeddedApp: false,
  adapter: NodeAdapter,
  restResources
});

// Register webhook handlers
const rawBodyParser = bodyParser.raw({ type: 'application/json', limit: '5mb' });

app.post(
  `${config.app.webhookPath}/inventory-update`,
  rawBodyParser,
  verifyShopifyWebhook,
  webhookHandlers.handleInventoryUpdate
);
app.post(
  `${config.app.webhookPath}/order-create`,
  rawBodyParser,
  verifyShopifyWebhook,
  webhookHandlers.handleOrderCreate
);
app.post(
  `${config.app.webhookPath}/product-update`,
  rawBodyParser,
  verifyShopifyWebhook,
  webhookHandlers.handleProductUpdate
);
app.post(
  `${config.app.webhookPath}/product-create`,
  rawBodyParser,
  verifyShopifyWebhook,
  webhookHandlers.handleProductCreate
);
app.post(
  `${config.app.webhookPath}/order-cancelled`,
  rawBodyParser,
  verifyShopifyWebhook,
  webhookHandlers.handleOrderCancelled
);

// Cart API endpoints
app.post(`${config.app.cartApiPath}/add`, bodyParser.json(), async (req, res) => { // Added bodyParser.json() here
  try {
    const { variantId } = req.body;
    if (!variantId) {
      return res.status(400).json({ error: 'Variant ID is required' });
    }
    
    // Process inventory sync for cart addition
    const result = await inventoryService.handleCartAddition(variantId);
    res.json(result);
  } catch (error) {
    console.error('Error handling cart addition:', error);
    res.status(500).json({ error: 'Failed to process cart addition' });
  }
});

// Admin dashboard endpoints
app.get('/api/status', async (req, res) => {
  try {
    const status = await productService.getProductGroupsStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Initialize app on startup
async function initializeApp() {
  try {
    console.log('Initializing app...');
    
    // Scan all products to build initial product groups
    await productService.scanAllProducts();
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Start the server
app.listen(config.app.port, () => {
  console.log(`Server running on port ${config.app.port}`);
  initializeApp();
});

module.exports = app;
