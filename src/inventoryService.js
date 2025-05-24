// Inventory service for managing product inventory synchronization
const { GraphQLClient } = require('graphql-request');
const config = require('./config');
const db = require('./db');

// Initialize GraphQL client for Shopify Admin API
const shopifyClient = new GraphQLClient(
  `https://${config.shopify.hostName}/admin/api/${config.shopify.apiVersion}/graphql.json`,
  {
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  }
);

/**
 * Sync inventory for a specific inventory item across all related variants
 * @param {string} inventoryItemId - The inventory item ID that was updated
 * @param {number} newInventoryLevel - The new inventory level
 */
async function syncInventoryForItem(inventoryItemId, newInventoryLevel) {
  try {
    console.log(`Syncing inventory for item ${inventoryItemId} to level ${newInventoryLevel}`);
    
    // Find the product group containing this inventory item
    const productGroup = await db.findProductGroupByInventoryItemId(inventoryItemId);
    
    if (!productGroup) {
      console.log(`No product group found for inventory item ${inventoryItemId}`);
      return;
    }
    
    // Update the shared inventory count in the product group
    await db.updateProductGroupInventory(productGroup.id, newInventoryLevel);
    
    // If inventory is zero or less, set all variants to zero
    if (newInventoryLevel <= 0) {
      await setAllVariantsInventory(productGroup, 0);
    } else {
      // Otherwise, set all variants to the new level
      await setAllVariantsInventory(productGroup, newInventoryLevel);
    }
    
    console.log(`Successfully synced inventory for product group ${productGroup.id}`);
  } catch (error) {
    console.error('Error syncing inventory:', error);
    throw error;
  }
}

/**
 * Handle cart addition event
 * @param {string} variantId - The variant ID being added to cart
 */
async function handleCartAddition(variantId) {
  try {
    console.log(`Handling cart addition for variant ${variantId}`);
    
    // Find the product group for this variant
    const productGroup = await db.findProductGroupByVariantId(variantId);
    
    if (!productGroup) {
      console.log(`No product group found for variant ${variantId}`);
      return { success: false, message: 'Product not found' };
    }
    
    // Get current inventory level
    async function getInventoryLevel(inventoryItemId) {
      try {
        console.log(`Fetching inventory level for item ${inventoryItemId}...`);
        
        // First, we need to get the inventory level ID
        const inventoryLevelsQuery = `
          query getInventoryLevels($inventoryItemId: ID!) {
            inventoryItem(id: $inventoryItemId) {
              inventoryLevels(first: 1) { # Assuming the first inventory level is the relevant one
                edges {
                  node {
                    id
                    quantities(names: ["available"]) { # Request only "available" quantity
                      name # name should be "available"
                      quantity
                    }
                    location {
                      id
                    }
                  }
                }
              }
            }
          }
        `;
        
        const variables = {
          inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`
        };
        
        const result = await shopifyClient.request(inventoryLevelsQuery, variables);
        console.log('Fetched inventoryItem data for ID ' + inventoryItemId + ' in inventoryService:', JSON.stringify(result, null, 2));
        
        let availableQuantity = 0;
        
        if (result.inventoryItem &&
            result.inventoryItem.inventoryLevels &&
            result.inventoryItem.inventoryLevels.edges &&
            result.inventoryItem.inventoryLevels.edges.length > 0 &&
            result.inventoryItem.inventoryLevels.edges[0].node &&
            result.inventoryItem.inventoryLevels.edges[0].node.quantities &&
            result.inventoryItem.inventoryLevels.edges[0].node.quantities.length > 0) {
          
          // The query requests quantities(names: ["available"]), 
          // so quantities[0] should be the "available" quantity.
          const quantityInfo = result.inventoryItem.inventoryLevels.edges[0].node.quantities[0];
          
          // Check name for robustness, though it should always be "available".
          if (quantityInfo && quantityInfo.name === "available") {
            availableQuantity = quantityInfo.quantity;
          }
        }
        
        console.log('Extracted available quantity for ' + inventoryItemId + ' in inventoryService: ' + availableQuantity);
        return availableQuantity;
      } catch (error) {
        console.error(`Error fetching inventory level for item ${inventoryItemId}:`, error);
        // It's important to re-throw or handle the error appropriately. 
        // For now, let's ensure it returns 0 in case of error as per requirements for missing data.
        // However, logging the error is good. If the calling function expects an error, re-throw.
        // Given the prior logic returned 0 on missing data, returning 0 on error might be consistent here too.
        console.log('Extracted available quantity for ' + inventoryItemId + ' in inventoryService: 0 (due to error or missing data)');
        return 0; // Ensure 0 is returned on error to prevent further issues.
      }
    }
    
    // Get the inventory item ID for this variant
    const inventoryItemId = productGroup.inventoryItemIds[0];
    if (!inventoryItemId) {
      console.log(`No inventory item found for variant ${variantId}`);
      return { success: false, message: 'No inventory item found' };
    }
    
    // Get current inventory level
    const currentInventory = await getInventoryLevel(inventoryItemId);
    
    // If inventory is zero, reject the addition
    if (currentInventory <= 0) {
      return { success: false, message: 'Out of stock' };
    }
    
    // Reduce inventory and update Shopify
    await syncInventoryForItem(inventoryItemId, currentInventory - 1);
    
    return { success: true };
  } catch (error) {
    console.error('Error handling cart addition:', error);
    return { success: false, message: 'Error processing cart addition' };
  }
}

/**
 * Handle order line item
 * @param {string} variantId - The variant ID in the order
 */
async function handleOrderLineItem(variantId) {
  try {
    console.log(`Handling order line item for variant ${variantId}`);
    
    // Find the product group for this variant
    const productGroup = await db.findProductGroupByVariantId(variantId);
    
    if (!productGroup) {
      console.log(`No product group found for variant ${variantId}`);
      return;
    }
    
    // Get current inventory level
    const currentInventory = productGroup.sharedInventoryCount;
    
    // Reduce inventory for all variants
    const newInventory = Math.max(0, currentInventory - 1);
    await syncInventoryForItem(productGroup.inventoryItemIds[0], newInventory);
    
    console.log(`Successfully processed order line item for variant ${variantId}`);
  } catch (error) {
    console.error('Error handling order line item:', error);
    throw error;
  }
}

/**
 * Set inventory level for all variants in a product group
 * @param {object} productGroup - The product group
 * @param {number} inventoryLevel - The inventory level to set
 */
async function setAllVariantsInventory(productGroup, inventoryLevel) {
  try {
    console.log(`Setting inventory level ${inventoryLevel} for all variants in product group ${productGroup.id}`);
    
    // Update inventory for each inventory item in the product group
    for (const inventoryItemId of productGroup.inventoryItemIds) {
      await updateShopifyInventory(inventoryItemId, inventoryLevel);
    }
  } catch (error) {
    console.error('Error setting inventory for variants:', error);
    throw error;
  }
}

/**
 * Update inventory level in Shopify
 * @param {string} inventoryItemId - The inventory item ID
 * @param {number} availableQuantity - The quantity to set
 */
async function updateShopifyInventory(inventoryItemId, availableQuantity) {
  try {
    // Get the location ID for this inventory item
    const locationId = await getInventoryItemLocationId(inventoryItemId);
    
    if (!locationId) {
      console.error(`No location found for inventory item ${inventoryItemId}`);
      return;
    }
    
    // GraphQL mutation to set inventory level
    const mutation = `
      mutation inventorySetQuantity($input: InventorySetQuantityInput!) {
        inventorySetQuantity(input: $input) {
          inventoryLevel {
            available
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const variables = {
      input: {
        inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
        locationId,
        availableQuantity
      }
    };
    
    const result = await shopifyClient.request(mutation, variables);
    
    if (result.inventorySetQuantity.userErrors.length > 0) {
      console.error('Error updating Shopify inventory:', result.inventorySetQuantity.userErrors);
      throw new Error('Failed to update Shopify inventory');
    }
    
    console.log(`Successfully updated inventory for item ${inventoryItemId} to ${availableQuantity}`);
    return result.inventorySetQuantity.inventoryLevel;
  } catch (error) {
    console.error('Error updating Shopify inventory:', error);
    throw error;
  }
}

/**
 * Get location ID for an inventory item
 * @param {string} inventoryItemId - The inventory item ID
 * @returns {string} The location ID
 */
async function getInventoryItemLocationId(inventoryItemId) {
  try {
    // GraphQL query to get inventory level
    const query = `
      query getInventoryLevels($inventoryItemId: ID!) {
        inventoryItem(id: $inventoryItemId) {
          inventoryLevels(first: 1) {
            edges {
              node {
                location {
                  id
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`
    };
    
    const result = await shopifyClient.request(query, variables);
    
    if (!result.inventoryItem || 
        !result.inventoryItem.inventoryLevels || 
        !result.inventoryItem.inventoryLevels.edges || 
        result.inventoryItem.inventoryLevels.edges.length === 0) {
      return null;
    }
    
    return result.inventoryItem.inventoryLevels.edges[0].node.location.id;
  } catch (error) {
    console.error('Error getting inventory item location:', error);
    throw error;
  }
}

/**
 * Check if an order was completed for a variant
 * This is a placeholder function - in a real implementation,
 * this would check against order records in the database
 * @param {string} variantId - The variant ID
 * @returns {boolean} Whether an order was completed
 */
async function checkIfOrderCompleted(variantId) {
  // In a real implementation, this would check against order records
  // For now, we'll just return false to simulate an abandoned cart
  return false;
}

module.exports = {
  syncInventoryForItem,
  handleCartAddition,
  handleOrderLineItem
};
