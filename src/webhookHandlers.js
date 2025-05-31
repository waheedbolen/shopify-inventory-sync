// Webhook handlers for Shopify events
const inventoryService = require('./inventoryService');
const productService = require('./productService');
const db = require('./db'); // Added db import

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

/**
 * Handle order cancellation webhook
 * Triggered when an order is cancelled in Shopify
 */
async function handleOrderCancelled(req, res) {
  try {
    console.log('Received order cancelled webhook. Payload:', JSON.stringify(req.body, null, 2));

    const lineItems = req.body.line_items; // Direct access, assuming body is parsed JSON
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      console.log('No line items found in the cancelled order or line_items is not an array. No restocking needed.');
      return res.status(200).send('Order cancellation processed. No line items to restock or invalid format.');
    }

    for (const item of lineItems) {
      const inventoryItemId = item.inventory_item_id; // Prioritize direct access
      const quantity = item.quantity;

      if (inventoryItemId && typeof quantity === 'number' && quantity > 0) {
        console.log(`Processing cancellation for inventory_item_id: ${inventoryItemId}, quantity to restock: ${quantity}`);

        const productGroup = await db.findProductGroupByInventoryItemId(inventoryItemId);

        if (productGroup) {
          const newSharedInventoryCount = productGroup.sharedInventoryCount + quantity;
          console.log(`Restocking product group ${productGroup.id} from ${productGroup.sharedInventoryCount} to ${newSharedInventoryCount}`);

          await db.updateProductGroupInventory(productGroup.id, newSharedInventoryCount);
          productGroup.sharedInventoryCount = newSharedInventoryCount; // Update in-memory count for subsequent calls if any within same webhook

          await inventoryService.setAllVariantsInventory(productGroup, newSharedInventoryCount);

          console.log(`Successfully restocked item ${inventoryItemId} for product group ${productGroup.id}`);
        } else {
          console.warn(`No product group found for cancelled inventory_item_id: ${inventoryItemId}. Skipping restock.`);
        }
      } else {
        // Log details of the item that's being skipped
        console.warn('Skipping line item due to missing inventory_item_id or invalid quantity:', JSON.stringify(item, null, 2));
      }
    }

    res.status(200).send('Order cancellation processed. Inventory restocked where applicable.');
  } catch (error) {
    console.error('Error processing order cancelled webhook:', error);
    res.status(500).send('Error processing webhook');
  }
}

module.exports = {
  handleInventoryUpdate,
  handleOrderCreate,
  handleProductUpdate,
  handleProductCreate,
  handleOrderCancelled
};
