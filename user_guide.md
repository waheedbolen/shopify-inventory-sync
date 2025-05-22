# Shopify Inventory Sync App - User Guide

## Overview

The Shopify Inventory Sync App ensures that all variations of a product share a single inventory count. This is perfect for exclusive artwork with different size and frame color options, where you want all variations to be marked as sold out when any variation is purchased.

## Key Features

- **Shared Inventory**: All variations of a product share a single inventory count
- **Immediate Synchronization**: When any variation is added to cart or purchased, all other variations immediately show as unavailable
- **Automatic Detection**: The app automatically detects all products with variations
- **Cart Integration**: Inventory is reserved when items are added to cart, not just at purchase

## How It Works

1. **Product Detection**: The app automatically scans your store for products with variations
2. **Inventory Monitoring**: When inventory changes for any variation, all other variations are updated to match
3. **Cart Integration**: When a customer adds any variation to their cart, all other variations are immediately marked as unavailable
4. **Order Processing**: When an order is placed, inventory is permanently reduced for all variations

## Using the App

### Viewing Synchronized Products

To see which products are being synchronized:

1. Access the app's status page at `https://your-app-server.com/api/status`
2. This will show all product groups and their current shared inventory counts

### Managing Inventory

You can manage inventory as you normally would in Shopify:

1. Go to **Products > Inventory** in your Shopify admin
2. Update the inventory for any variation of a product
3. The app will automatically synchronize the inventory across all variations

### Testing the App

To verify that the app is working correctly:

1. Go to a product with multiple variations in your store
2. Add one variation to your cart
3. Try to add another variation of the same product to your cart
4. You should see an error message indicating that the item is out of stock

## Best Practices

- **Inventory Management**: Only update inventory for one variation of each product, as changes will be synchronized to all variations
- **Product Organization**: Group variations using Shopify's built-in variant system for the app to detect them properly
- **Server Monitoring**: Regularly check that the app server is running to ensure continuous synchronization

## Troubleshooting

### Common Issues

1. **Variations not synchronizing**:
   - Ensure the product has proper variations set up in Shopify
   - Check that the app server is running
   - Verify webhook configurations

2. **Cart additions not being blocked**:
   - Ensure the cart monitor script is properly installed in your theme
   - Check browser console for JavaScript errors
   - Verify the app server URL is correctly set in the script

3. **Inventory not updating immediately**:
   - Check network connectivity between your store and the app server
   - Verify webhook deliveries in Shopify admin

### Getting Help

If you encounter issues that you cannot resolve, please contact [your contact information] with:

1. A description of the issue
2. Screenshots if applicable
3. The time when the issue occurred
4. Any error messages you received

## Limitations

- The app requires a server to run continuously
- Cart reservations expire after 30 minutes if checkout is not completed
- The app only works with products that have variations set up using Shopify's variant system
