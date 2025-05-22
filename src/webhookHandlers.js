// Webhook handlers for Shopify events
const inventoryService = require('./inventoryService');
const productService = require('./productService');

/**
 * Handle inventory level update webhook
 * Triggered when inventory levels are updated in Shopify
 */
async function handleInventoryUpdate(req, res) {
  try {
    const data = req.body;
    console.log('Received inventory update webhook:', JSON.stringify(data));
    
    // Extract inventory item ID and new inventory level
    const inventoryItemId = data.inventory_item_id;
    const newInventoryLevel = data.available;
    
    // Process inventory sync
    await inventoryService.syncInventoryForItem(inventoryItemId, newInventoryLevel);
    
    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing inventory update webhook:', error);
    res.status(500).send('Error processing webhook');
  }
}

/**
 * Handle order creation webhook
 * Triggered when a new order is created in Shopify
 */
async function handleOrderCreate(req, res) {
  try {
    const data = req.body;
    console.log('Received order create webhook:', JSON.stringify(data));
    
    // Extract line items from the order
    const lineItems = data.line_items || [];
    
    // Process each line item to sync inventory
    for (const item of lineItems) {
      const variantId = item.variant_id;
      if (variantId) {
        await inventoryService.handleOrderLineItem(variantId);
      }
    }
    
    res.status(200).send('Order webhook processed successfully');
  } catch (error) {
    console.error('Error processing order create webhook:', error);
    res.status(500).send('Error processing webhook');
  }
}

/**
 * Handle product update webhook
 * Triggered when a product is updated in Shopify
 */
async function handleProductUpdate(req, res) {
  try {
    const data = req.body;
    console.log('Received product update webhook:', JSON.stringify(data));
    
    // Update product group for this product
    await productService.updateProductGroup(data.id, data);
    
    res.status(200).send('Product update webhook processed successfully');
  } catch (error) {
    console.error('Error processing product update webhook:', error);
    res.status(500).send('Error processing webhook');
  }
}

/**
 * Handle product creation webhook
 * Triggered when a new product is created in Shopify
 */
async function handleProductCreate(req, res) {
  try {
    const data = req.body;
    console.log('Received product create webhook:', JSON.stringify(data));
    
    // Create product group for this new product
    await productService.createProductGroup(data);
    
    res.status(200).send('Product create webhook processed successfully');
  } catch (error) {
    console.error('Error processing product create webhook:', error);
    res.status(500).send('Error processing webhook');
  }
}

module.exports = {
  handleInventoryUpdate,
  handleOrderCreate,
  handleProductUpdate,
  handleProductCreate
};
