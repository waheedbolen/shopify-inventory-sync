// Product service for managing product groups
const { GraphQLClient } = require('graphql-request');
const config = require('./config');
const db = require('./db');

// Initialize GraphQL client for Shopify Admin API
const shopifyClient = new GraphQLClient(
  `https://${config.shopify.hostName}/admin/api/2025-04/graphql.json`,
  {
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
    },
  }
);

/**
 * Scan all products in the store to build product groups
 */
async function scanAllProducts() {
  try {
    console.log('Scanning all products to build product groups...');
    
    // Get all products with variants
    const products = await getAllProducts();
    
    // Process each product
    for (const product of products) {
      await createProductGroup(product);
    }
    
    console.log(`Completed scanning ${products.length} products`);
  } catch (error) {
    console.error('Error scanning products:', error);
    throw error;
  }
}

/**
 * Create a product group for a product
 * @param {object} product - The product data
 */
async function createProductGroup(product) {
  try {
    // Skip products with no variants or only one variant
    if (!product.variants || product.variants.length <= 1) {
      console.log(`Skipping product ${product.id} - no variants or only one variant`);
      return;
    }
    
    console.log(`Creating product group for product ${product.id} with ${product.variants.length} variants`);
    
    // Extract variant IDs and inventory item IDs
    const variantIds = [];
    const inventoryItemIds = [];
    
    for (const variant of product.variants) {
      variantIds.push(variant.id);
      inventoryItemIds.push(variant.inventory_item_id);
    }
    
    // Get current inventory level for the first variant
    const inventoryLevel = await getInventoryLevel(inventoryItemIds[0]);
    
    // Create product group
    const productGroup = {
      id: product.id,
      title: product.title,
      variantIds,
      inventoryItemIds,
      sharedInventoryCount: inventoryLevel
    };
    
    // Save to database
    await db.saveProductGroup(productGroup);
    
    console.log(`Successfully created product group for ${product.title}`);
  } catch (error) {
    console.error(`Error creating product group for product ${product.id}:`, error);
    throw error;
  }
}

/**
 * Update a product group when product is updated
 * @param {string} productId - The product ID
 * @param {object} productData - The updated product data
 */
async function updateProductGroup(productId, productData) {
  try {
    console.log(`Updating product group for product ${productId}`);
    
    // Get full product data if not provided
    const product = productData.variants ? productData : await getProduct(productId);
    
    // Skip products with no variants or only one variant
    if (!product.variants || product.variants.length <= 1) {
      console.log(`Removing product group for ${productId} - no variants or only one variant`);
      await db.removeProductGroup(productId);
      return;
    }
    
    // Extract variant IDs and inventory item IDs
    const variantIds = [];
    const inventoryItemIds = [];
    
    for (const variant of product.variants) {
      variantIds.push(variant.id);
      inventoryItemIds.push(variant.inventory_item_id);
    }
    
    // Get existing product group
    const existingGroup = await db.getProductGroup(productId);
    
    // Get current inventory level
    const inventoryLevel = existingGroup ? 
      existingGroup.sharedInventoryCount : 
      await getInventoryLevel(inventoryItemIds[0]);
    
    // Update product group
    const productGroup = {
      id: productId,
      title: product.title,
      variantIds,
      inventoryItemIds,
      sharedInventoryCount: inventoryLevel
    };
    
    // Save to database
    await db.saveProductGroup(productGroup);
    
    console.log(`Successfully updated product group for ${product.title}`);
  } catch (error) {
    console.error(`Error updating product group for product ${productId}:`, error);
    throw error;
  }
}

/**
 * Get all products with variants from Shopify
 * @returns {Array} Array of products
 */
async function getAllProducts() {
  try {
    console.log('Fetching all products from Shopify...');
    
    // GraphQL query to get all products with variants
    const query = `
  query getAllProductsQuery($after: String) {
    products(first: 250, after: $after) {
      edges {
        node {
          id
          title
          variants(first: 100) { # Variants pagination not handled in this step
            edges {
              node {
                id
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
    
    let allProductsArray = [];
    let afterCursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`Fetching page ${pageCount} of products, after cursor: ${afterCursor}`);
      const result = await shopifyClient.request(query, { after: afterCursor });

      if (result && result.products && result.products.edges && result.products.pageInfo) {
        const fetchedProducts = result.products.edges.map(edge => {
          const product = edge.node;
          return {
            id: product.id.replace('gid://shopify/Product/', ''),
            title: product.title,
            variants: product.variants.edges.map(variantEdge => {
              const variant = variantEdge.node;
              return {
                id: variant.id.replace('gid://shopify/ProductVariant/', ''),
                title: variant.title,
                inventory_item_id: variant.inventoryItem.id.replace('gid://shopify/InventoryItem/', '')
              };
            })
          };
        });
        
        allProductsArray = allProductsArray.concat(fetchedProducts);
        hasNextPage = result.products.pageInfo.hasNextPage;
        afterCursor = result.products.pageInfo.endCursor;
        
        console.log(`Fetched a page of products. Total products so far: ${allProductsArray.length}. Has next page: ${hasNextPage}`);
        
        // Safety break if endCursor is null but hasNextPage is true (should not happen with Shopify)
        if (hasNextPage && !afterCursor) {
            console.warn('hasNextPage is true but endCursor is null. Breaking loop to prevent infinite loop.');
            break;
        }
      } else {
        console.error('Error fetching a page of products or pageInfo missing. Breaking loop.', result);
        hasNextPage = false; // Stop the loop
      }
    } while (hasNextPage);
    
    console.log(`Finished fetching all pages. Total products found: ${allProductsArray.length}`);
    return allProductsArray;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Get a single product by ID
 * @param {string} productId - The product ID
 * @returns {object} The product data
 */
async function getProduct(productId) {
  try {
    console.log(`Fetching product ${productId} from Shopify...`);
    
    // GraphQL query to get a single product with variants
    const query = `
      query getProduct($productId: ID!) {
        product(id: $productId) {
          id
          title
          variants(first: 100) {
            edges {
              node {
                id
                title
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      productId: `gid://shopify/Product/${productId}`
    };
    
    const result = await shopifyClient.request(query, variables);
    
    // Transform the GraphQL response to a simpler format
    const product = result.product;
    return {
      id: product.id.replace('gid://shopify/Product/', ''),
      title: product.title,
      variants: product.variants.edges.map(variantEdge => {
        const variant = variantEdge.node;
        return {
          id: variant.id.replace('gid://shopify/ProductVariant/', ''),
          title: variant.title,
          inventory_item_id: variant.inventoryItem.id.replace('gid://shopify/InventoryItem/', '')
        };
      })
    };
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    throw error;
  }
}

/**
 * Get inventory level for an inventory item
 * @param {string} inventoryItemId - The inventory item ID
 * @returns {number} The available inventory quantity
 */
async function getInventoryLevel(inventoryItemId) {
  try {
    console.log(`Fetching inventory level for item ${inventoryItemId}...`);
    
    // GraphQL query to get inventory level
    const query = `
      query getInventoryLevel($inventoryItemId: ID!) {
        inventoryItem(id: $inventoryItemId) {
          inventoryLevels(first: 5) { # Assuming we might check up to 5 locations/levels for the item
            edges {
              node {
                quantities(names: ["available"]) { # Request only "available" quantity
                  name # name will be "available"
                  quantity
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
    console.log('Fetched inventoryItem data for ID ' + inventoryItemId + ':', JSON.stringify(result, null, 2));
    
    let totalAvailable = 0;
    
    if (result.inventoryItem && result.inventoryItem.inventoryLevels && result.inventoryItem.inventoryLevels.edges) {
      for (const edge of result.inventoryItem.inventoryLevels.edges) {
        // Check if node and quantities exist, and quantities array is not empty
        if (edge.node && edge.node.quantities && edge.node.quantities.length > 0) {
          // The query requests quantities(names: ["available"]), so the first item 
          // in the quantities array should be the "available" quantity.
          // We also check name for robustness, though it should always be "available".
          const quantityInfo = edge.node.quantities[0];
          if (quantityInfo && quantityInfo.name === "available") {
            totalAvailable += quantityInfo.quantity;
          }
        }
      }
    }
    
    console.log('Calculated total available inventory for ' + inventoryItemId + ': ' + totalAvailable);
    return totalAvailable;
  } catch (error) {
    console.error(`Error fetching inventory level for item ${inventoryItemId}:`, error);
    throw error;
  }
}

/**
 * Get status of all product groups
 * @returns {object} Status information
 */
async function getProductGroupsStatus() {
  try {
    const productGroups = await db.getAllProductGroups();
    
    return {
      totalProductGroups: productGroups.length,
      productGroups: productGroups.map(group => ({
        id: group.id,
        title: group.title,
        variantCount: group.variantIds.length,
        sharedInventoryCount: group.sharedInventoryCount
      }))
    };
  } catch (error) {
    console.error('Error getting product groups status:', error);
    throw error;
  }
}

module.exports = {
  scanAllProducts,
  createProductGroup,
  updateProductGroup,
  getProductGroupsStatus
};
