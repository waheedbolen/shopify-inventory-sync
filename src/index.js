// Main application entry point
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Shopify } = require('@shopify/shopify-api');
const config = require('./config');
const webhookHandlers = require('./webhookHandlers');
const inventoryService = require('./inventoryService');
const productService = require('./productService');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Shopify API
const shopify = new Shopify({
  apiKey: config.shopify.apiKey,
  apiSecretKey: config.shopify.apiSecretKey,
  scopes: config.shopify.scopes,
  hostName: config.shopify.hostName,
  apiVersion: config.shopify.apiVersion,
  isEmbeddedApp: false
});

// Register webhook handlers
app.post(`${config.app.webhookPath}/inventory-update`, webhookHandlers.handleInventoryUpdate);
app.post(`${config.app.webhookPath}/order-create`, webhookHandlers.handleOrderCreate);
app.post(`${config.app.webhookPath}/product-update`, webhookHandlers.handleProductUpdate);
app.post(`${config.app.webhookPath}/product-create`, webhookHandlers.handleProductCreate);

// Cart API endpoints
app.post(`${config.app.cartApiPath}/add`, async (req, res) => {
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
