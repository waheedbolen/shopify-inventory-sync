# Shopify Inventory Sync App - Installation Guide

This guide will help you install and configure the Shopify Inventory Sync App for your store.

## Overview

The Shopify Inventory Sync App ensures that all variations of a product share a single inventory count. When any variation is purchased or added to cart, all other variations will immediately show as unavailable, making it perfect for exclusive artwork with different size and frame color options.

## Prerequisites

- A Shopify store with Admin API access
- Node.js 16+ and npm installed on your server
- Basic knowledge of Shopify's admin interface

## Installation Steps

### 1. Create a Private App in Shopify

1. Log in to your Shopify admin panel
2. Go to **Apps > Manage private apps**
3. Click **Create new private app**
4. Fill in the app details:
   - App name: `Inventory Sync App`
   - Emergency developer email: [Your email]
5. Under **Admin API**, set the following permissions:
   - Products: Read and write
   - Inventory: Read and write
   - Orders: Read and write
6. Click **Save**
7. Note down the **API key** and **API secret key** - you'll need these later

### 2. Set Up the App Server

1. Clone or download the app files to your server
2. Navigate to the app directory and create a `.env` file with the following content:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET_KEY=your_api_secret_key
   SHOPIFY_HOST_NAME=your-store.myshopify.com
   PORT=3000
   ```
3. Replace `your_api_key`, `your_api_secret_key`, and `your-store.myshopify.com` with your actual values
4. Install dependencies:
   ```
   npm install
   ```
5. Start the app:
   ```
   npm start
   ```

### 3. Set Up Webhooks in Shopify

1. Go to **Settings > Notifications > Webhooks** in your Shopify admin
2. Create the following webhooks, pointing to your app server:
   - Inventory levels/update: `https://your-app-server.com/webhooks/inventory-update`
   - Orders/create: `https://your-app-server.com/webhooks/order-create`
   - Products/update: `https://your-app-server.com/webhooks/product-update`
   - Products/create: `https://your-app-server.com/webhooks/product-create`

### 4. Add the Cart Monitor Script to Your Theme

1. Go to **Online Store > Themes** in your Shopify admin
2. Click **Actions > Edit code** for your active theme
3. Under the **Assets** folder, create a new file called `inventory-sync.js`
4. Copy the content from `src/cart-monitor.js` into this file
5. Replace `{{APP_SERVER_URL}}` with your actual app server URL
6. Open the `theme.liquid` file in the **Layout** folder
7. Add the following line just before the closing `</body>` tag:
   ```html
   <script src="{{ 'inventory-sync.js' | asset_url }}" defer></script>
   ```
8. Click **Save**

## Verification

To verify that the app is working correctly:

1. Go to a product with multiple variations in your store
2. Add one variation to your cart
3. Try to add another variation of the same product to your cart
4. You should see an error message indicating that the item is out of stock

## Troubleshooting

If you encounter issues:

1. Check the app server logs for errors
2. Verify that all webhooks are properly configured
3. Ensure the cart monitor script is correctly added to your theme
4. Confirm that your products have variations set up correctly

For additional support, please contact [your contact information].

## Limitations

- The app requires a server to run continuously
- Cart reservations expire after 30 minutes if checkout is not completed
- The app only works with products that have variations

## Next Steps

After installation, the app will automatically detect all products with variations and begin synchronizing inventory. No further configuration is needed.
