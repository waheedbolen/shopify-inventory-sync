# Shopify Inventory Sync App Design Document

## Overview

This document outlines the design for a private Shopify app that synchronizes inventory across all product variations. When one variation of a product is purchased or added to cart, all other variations will immediately show as unavailable, reflecting that the unique artwork is no longer available regardless of size or frame color selection.

## Requirements

Based on user requirements, the app must:
- Function as a private app for a single store
- Apply to all products with variations
- Provide immediate synchronization when items are added to cart
- Automatically detect products with variations
- Ensure that when inventory reaches zero for any variation, all variations show as unavailable

## Technical Constraints

After reviewing Shopify's API documentation, we've identified several technical constraints:

1. The `committed` inventory state cannot be directly manipulated through the Admin API
2. Cart operations don't automatically trigger webhooks
3. Inventory webhooks are only triggered for specific inventory state changes
4. Real-time inventory locking at cart-add stage requires custom implementation

## Design Solution

### Architecture Overview

The solution will use a combination of:
1. Shopify Admin API for inventory management
2. Shopify Webhooks for event-driven updates
3. Custom JavaScript for frontend cart monitoring
4. Server-side logic for inventory synchronization

### Component Design

#### 1. Admin Dashboard Extension

- Simple configuration interface in the Shopify admin
- Toggle to enable/disable the sync functionality
- Status display showing synchronized products

#### 2. Inventory Sync Service

- Core service that maintains a mapping between product variants and their parent products
- Monitors inventory changes through webhooks
- Executes synchronization logic when inventory changes are detected

#### 3. Cart Monitoring Script

- JavaScript snippet injected into the store's theme
- Intercepts "Add to Cart" actions
- Communicates with the Inventory Sync Service to trigger immediate updates

#### 4. Webhook Handlers

- `inventory_levels/update`: Triggers when inventory levels change
- `orders/create`: Triggers when orders are placed
- `products/update`: Triggers when products are updated
- `products/create`: Triggers when new products are created

### Data Model

```
ProductGroup {
  productId: string
  variants: Array<string> // variant IDs
  inventoryItemIds: Array<string> // inventory item IDs for each variant
  sharedInventoryCount: number
}
```

### Synchronization Logic

1. **Product Detection**:
   - On app installation, scan all products to identify those with variations
   - Create ProductGroup records for each product with variations
   - Update ProductGroup records when products are created or modified

2. **Inventory Monitoring**:
   - Listen for inventory update webhooks
   - When inventory changes for any variant in a ProductGroup:
     - If inventory decreases to 0, set all variants to 0
     - If inventory increases from 0, update all variants to the new value

3. **Cart Monitoring**:
   - When an item is added to cart:
     - Identify the ProductGroup for the variant
     - Temporarily reserve inventory for all variants in the group
     - If cart is abandoned or checkout times out, restore inventory

4. **Checkout Process**:
   - When checkout completes:
     - Permanently reduce inventory for all variants in the ProductGroup
     - Ensure all variants show the same inventory count

### Implementation Approach

#### Phase 1: Core Inventory Sync

1. Create app scaffolding with Shopify CLI
2. Implement ProductGroup data model
3. Create webhook handlers for inventory updates
4. Implement basic inventory synchronization logic

#### Phase 2: Cart Integration

1. Develop JavaScript snippet for cart monitoring
2. Implement temporary reservation system
3. Create API endpoints for cart events
4. Test cart-add synchronization

#### Phase 3: Admin Interface

1. Create simple admin interface
2. Implement configuration options
3. Add status monitoring and reporting

## Technical Implementation Details

### Shopify API Integration

We'll use the GraphQL Admin API for most operations, particularly:

- `inventoryLevel` and `inventoryItem` queries to retrieve inventory quantities
- `inventoryAdjustQuantities` mutation to adjust inventory quantities
- Product and variant queries to build and maintain ProductGroup records

### Cart Monitoring Implementation

Since Shopify doesn't provide webhooks for cart operations, we'll use:

1. A JavaScript snippet injected into the theme that:
   - Intercepts the "Add to Cart" button click or form submission
   - Makes an API call to our app server before allowing the cart addition
   - Our server will then update all variant inventories
   - After successful inventory update, the item is added to cart

2. A server endpoint that:
   - Receives the variant ID being added to cart
   - Identifies all related variants in the same ProductGroup
   - Updates inventory for all variants accordingly

### Inventory Synchronization Algorithm

```
function syncInventory(variantId, newInventoryCount):
  productGroup = findProductGroupByVariantId(variantId)
  
  if (!productGroup) return
  
  if (newInventoryCount <= 0):
    // If any variant is out of stock, all should be out of stock
    for each variantId in productGroup.variants:
      setInventoryLevel(variantId, 0)
  else:
    // If inventory is increased, update all variants
    for each variantId in productGroup.variants:
      setInventoryLevel(variantId, newInventoryCount)
```

## Challenges and Solutions

### Challenge 1: Cart Abandonment

**Problem**: When items are added to cart but checkout is not completed, inventory needs to be restored.

**Solution**: Implement a time-based reservation system that:
- Temporarily reduces inventory when items are added to cart
- Monitors cart session activity
- Restores inventory if checkout is not completed within a configurable timeframe

### Challenge 2: Race Conditions

**Problem**: Multiple simultaneous cart additions could lead to inventory inconsistencies.

**Solution**: Implement locking mechanisms in the inventory update process to ensure atomic operations.

### Challenge 3: Performance

**Problem**: Frequent inventory updates could impact store performance.

**Solution**: Optimize database queries and implement caching for ProductGroup lookups.

## Testing Strategy

1. **Unit Testing**:
   - Test individual components (webhook handlers, inventory sync logic)
   - Validate data model integrity

2. **Integration Testing**:
   - Test end-to-end flows from cart addition to inventory update
   - Verify webhook handling and inventory synchronization

3. **Edge Case Testing**:
   - Test concurrent cart additions
   - Test inventory restoration after cart abandonment
   - Test behavior when inventory is manually updated in Shopify admin

## Deployment Plan

1. Develop and test the app locally
2. Deploy as a private app to the user's Shopify store
3. Monitor initial operation and make adjustments as needed
4. Provide documentation and support

## Conclusion

This design provides a comprehensive solution for synchronizing inventory across product variations in a Shopify store. By combining Shopify's native APIs with custom frontend and backend logic, we can achieve the immediate inventory synchronization required by the user, ensuring that when any variation of a product is purchased or added to cart, all other variations immediately show as unavailable.
