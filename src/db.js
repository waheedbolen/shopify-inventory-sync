// Database service for storing and retrieving product groups
// In a production environment, this would use a real database
// For this implementation, we'll use an in-memory store

// In-memory storage for product groups
const productGroups = new Map();

/**
 * Save a product group to the database
 * @param {object} productGroup - The product group to save
 */
async function saveProductGroup(productGroup) {
  try {
    console.log(`Saving product group ${productGroup.id}`);
    productGroups.set(productGroup.id, productGroup);
    return productGroup;
  } catch (error) {
    console.error('Error saving product group:', error);
    throw error;
  }
}

/**
 * Get a product group by ID
 * @param {string} productGroupId - The product group ID
 * @returns {object} The product group
 */
async function getProductGroup(productGroupId) {
  try {
    return productGroups.get(productGroupId);
  } catch (error) {
    console.error('Error getting product group:', error);
    throw error;
  }
}

/**
 * Remove a product group
 * @param {string} productGroupId - The product group ID
 */
async function removeProductGroup(productGroupId) {
  try {
    console.log(`Removing product group ${productGroupId}`);
    productGroups.delete(productGroupId);
  } catch (error) {
    console.error('Error removing product group:', error);
    throw error;
  }
}

/**
 * Find a product group by variant ID
 * @param {string} variantId - The variant ID
 * @returns {object} The product group containing the variant
 */
async function findProductGroupByVariantId(variantId) {
  try {
    for (const [, group] of productGroups) {
      if (group.variantIds.includes(variantId)) {
        return group;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding product group by variant ID:', error);
    throw error;
  }
}

/**
 * Find a product group by inventory item ID
 * @param {string} inventoryItemId - The inventory item ID
 * @returns {object} The product group containing the inventory item
 */
async function findProductGroupByInventoryItemId(inventoryItemId) {
  try {
    for (const [, group] of productGroups) {
      if (group.inventoryItemIds.includes(inventoryItemId)) {
        return group;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding product group by inventory item ID:', error);
    throw error;
  }
}

/**
 * Update a product group's shared inventory count
 * @param {string} productGroupId - The product group ID
 * @param {number} inventoryCount - The new inventory count
 */
async function updateProductGroupInventory(productGroupId, inventoryCount) {
  try {
    const group = productGroups.get(productGroupId);
    if (group) {
      group.sharedInventoryCount = inventoryCount;
      productGroups.set(productGroupId, group);
    }
  } catch (error) {
    console.error('Error updating product group inventory:', error);
    throw error;
  }
}

/**
 * Get all product groups
 * @returns {Array} Array of all product groups
 */
async function getAllProductGroups() {
  try {
    return Array.from(productGroups.values());
  } catch (error) {
    console.error('Error getting all product groups:', error);
    throw error;
  }
}

module.exports = {
  saveProductGroup,
  getProductGroup,
  removeProductGroup,
  findProductGroupByVariantId,
  findProductGroupByInventoryItemId,
  updateProductGroupInventory,
  getAllProductGroups
};
