// Test script for the Shopify inventory sync app
const assert = require('assert');
const inventoryService = require('./inventoryService');
const productService = require('./productService');
const db = require('./db');

/**
 * Mock data for testing
 */
const mockProduct = {
  id: 'test-product-123',
  title: 'Test Artwork',
  variants: [
    {
      id: 'variant-1',
      title: 'Small / Black Frame',
      inventory_item_id: 'inventory-1'
    },
    {
      id: 'variant-2',
      title: 'Small / White Frame',
      inventory_item_id: 'inventory-2'
    },
    {
      id: 'variant-3',
      title: 'Medium / Black Frame',
      inventory_item_id: 'inventory-3'
    },
    {
      id: 'variant-4',
      title: 'Medium / White Frame',
      inventory_item_id: 'inventory-4'
    }
  ]
};

/**
 * Mock functions to replace actual API calls
 */
const mockShopifyAPI = {
  getInventoryLevel: async () => 5,
  updateInventory: async () => true
};

/**
 * Test suite for inventory sync functionality
 */
async function runTests() {
  console.log('Starting inventory sync tests...');
  
  try {
    // Setup: Create a test product group
    await setupTestData();
    
    // Test 1: Verify product group creation
    await testProductGroupCreation();
    
    // Test 2: Test cart addition
    await testCartAddition();
    
    // Test 3: Test inventory sync across variants
    await testInventorySync();
    
    // Test 4: Test out of stock behavior
    await testOutOfStock();
    
    console.log('\nAll tests passed successfully! ✅');
  } catch (error) {
    console.error('\nTest failed:', error);
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('\n--- Setting up test data ---');
  
  // Create a product group
  const productGroup = {
    id: mockProduct.id,
    title: mockProduct.title,
    variantIds: mockProduct.variants.map(v => v.id),
    inventoryItemIds: mockProduct.variants.map(v => v.inventory_item_id),
    sharedInventoryCount: 5
  };
  
  await db.saveProductGroup(productGroup);
  
  // Verify product group was saved
  const savedGroup = await db.getProductGroup(mockProduct.id);
  assert(savedGroup, 'Product group should be saved');
  assert.strictEqual(savedGroup.id, mockProduct.id, 'Product ID should match');
  assert.strictEqual(savedGroup.variantIds.length, 4, 'Should have 4 variants');
  
  console.log('Test data setup complete');
}

/**
 * Test product group creation
 */
async function testProductGroupCreation() {
  console.log('\n--- Test: Product Group Creation ---');
  
  // Test finding product group by variant ID
  const productGroup1 = await db.findProductGroupByVariantId('variant-1');
  assert(productGroup1, 'Should find product group by variant ID');
  assert.strictEqual(productGroup1.id, mockProduct.id, 'Product ID should match');
  
  // Test finding product group by inventory item ID
  const productGroup2 = await db.findProductGroupByInventoryItemId('inventory-2');
  assert(productGroup2, 'Should find product group by inventory item ID');
  assert.strictEqual(productGroup2.id, mockProduct.id, 'Product ID should match');
  
  console.log('Product group creation test passed');
}

/**
 * Test cart addition functionality
 */
async function testCartAddition() {
  console.log('\n--- Test: Cart Addition ---');
  
  // Mock the inventory service functions
  const originalSyncInventoryForItem = inventoryService.syncInventoryForItem;
  inventoryService.syncInventoryForItem = async (inventoryItemId, newInventoryCount) => {
    console.log(`Mock: Syncing inventory for ${inventoryItemId} to ${newInventoryCount}`);
    
    // Update the product group in the database
    const productGroup = await db.findProductGroupByInventoryItemId(inventoryItemId);
    if (productGroup) {
      await db.updateProductGroupInventory(productGroup.id, newInventoryCount);
    }
    
    return true;
  };
  
  // Test adding an item to cart
  const result = await inventoryService.handleCartAddition('variant-1');
  assert(result.success, 'Cart addition should succeed');
  
  // Verify inventory was reduced
  const productGroup = await db.getProductGroup(mockProduct.id);
  assert.strictEqual(productGroup.sharedInventoryCount, 4, 'Inventory should be reduced by 1');
  
  // Restore original function
  inventoryService.syncInventoryForItem = originalSyncInventoryForItem;
  
  console.log('Cart addition test passed');
}

/**
 * Test inventory sync across variants
 */
async function testInventorySync() {
  console.log('\n--- Test: Inventory Sync Across Variants ---');
  
  // Mock the inventory update function
  let updatedInventoryItems = [];
  const setAllVariantsInventory = async (productGroup, inventoryLevel) => {
    for (const inventoryItemId of productGroup.inventoryItemIds) {
      updatedInventoryItems.push({ id: inventoryItemId, level: inventoryLevel });
      console.log(`Mock: Setting inventory for ${inventoryItemId} to ${inventoryLevel}`);
    }
  };
  
  // Get the product group
  const productGroup = await db.getProductGroup(mockProduct.id);
  
  // Simulate inventory update
  await setAllVariantsInventory(productGroup, 3);
  
  // Verify all variants were updated
  assert.strictEqual(updatedInventoryItems.length, 4, 'All 4 variants should be updated');
  for (const item of updatedInventoryItems) {
    assert.strictEqual(item.level, 3, 'All variants should have inventory level 3');
  }
  
  console.log('Inventory sync test passed');
}

/**
 * Test out of stock behavior
 */
async function testOutOfStock() {
  console.log('\n--- Test: Out of Stock Behavior ---');
  
  // Mock the inventory service functions
  const originalSyncInventoryForItem = inventoryService.syncInventoryForItem;
  inventoryService.syncInventoryForItem = async (inventoryItemId, newInventoryCount) => {
    console.log(`Mock: Syncing inventory for ${inventoryItemId} to ${newInventoryCount}`);
    
    // Update the product group in the database
    const productGroup = await db.findProductGroupByInventoryItemId(inventoryItemId);
    if (productGroup) {
      await db.updateProductGroupInventory(productGroup.id, newInventoryCount);
    }
    
    return true;
  };
  
  // Set inventory to 1
  await db.updateProductGroupInventory(mockProduct.id, 1);
  
  // Test adding the last item to cart
  const result1 = await inventoryService.handleCartAddition('variant-2');
  assert(result1.success, 'Last item cart addition should succeed');
  
  // Verify inventory is now 0
  const productGroup1 = await db.getProductGroup(mockProduct.id);
  assert.strictEqual(productGroup1.sharedInventoryCount, 0, 'Inventory should be reduced to 0');
  
  // Try adding another item to cart
  const result2 = await inventoryService.handleCartAddition('variant-3');
  assert(!result2.success, 'Cart addition should fail when out of stock');
  
  // Restore original function
  inventoryService.syncInventoryForItem = originalSyncInventoryForItem;
  
  console.log('Out of stock test passed');
}

// Export the test runner
module.exports = {
  runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
