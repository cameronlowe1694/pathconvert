# PathConvert Theme App Extension - Setup Guide

## What is the PathConvert Theme App Extension?

PathConvert automatically adds AI-powered navigation buttons to your product pages. These buttons help customers discover related collections based on the current product they're viewing, improving navigation and increasing sales.

## Installation Steps

### Step 1: Install the PathConvert App

1. Go to the Shopify App Store and click "Add app" on PathConvert
2. Click "Install app" when prompted
3. Authorize the requested permissions

### Step 2: Configure Your Collections

1. After installation, you'll be taken to the PathConvert dashboard
2. Navigate to the **Collections** tab
3. Click "Sync Collections" to import your store's collections
4. Wait for the AI to analyze your products and build the recommendation engine (this may take a few minutes for large catalogs)

### Step 3: Enable the Theme App Extension

**Important:** The app extension must be manually activated in your theme editor.

1. From your Shopify admin, go to **Online Store → Themes**
2. On your current/live theme, click **Customize**
3. In the theme editor, navigate to any **Product page** template
4. Click **Add block** or **Add section** (depending on where you want the buttons)
5. Under "Apps", find and select **PathConvert Buttons**
6. Position the block where you want the navigation buttons to appear (recommended: below product description or near "Add to Cart" button)
7. Click **Save** in the top right corner

### Step 4: Customize Button Appearance (Optional)

With the PathConvert Buttons block selected in your theme editor:

1. Choose **Button alignment**: Left, Center, or Right
2. The buttons will automatically match your theme's styling
3. Preview the buttons on different products to ensure they look good
4. Click **Save** when satisfied

### Step 5: Test the Functionality

1. Open your online store and navigate to a product page
2. You should see AI-generated navigation buttons like "Shop Men's Clothing" or "View Athletic Wear"
3. Click a button to verify it takes you to the correct collection
4. The buttons update automatically based on which product is being viewed

## Troubleshooting

### Buttons not appearing on product pages?

- **Verify the extension is enabled**: Go to Online Store → Themes → Customize and check that "PathConvert Buttons" block is added to your product page template
- **Check if collections are synced**: In the PathConvert dashboard → Collections tab, ensure your collections show "Active" status
- **Clear your browser cache**: Hard refresh the product page (Ctrl+Shift+R or Cmd+Shift+R)

### Buttons showing but not loading recommendations?

- **Wait for initial processing**: After first install, allow 5-10 minutes for the AI to analyze your catalog
- **Verify collection data**: Go to PathConvert dashboard → Collections and click "Rebuild Embeddings" if needed
- **Check your subscription**: Ensure your PathConvert subscription is active in the Billing tab

### Buttons look misaligned or unstyled?

- **Adjust alignment setting**: In theme editor, select the PathConvert Buttons block and change the alignment option
- **Reposition the block**: Try moving it to a different location in your product page template
- **Contact support**: If styling issues persist, email support@pathconvert.com with screenshots

## How It Works

PathConvert uses AI embeddings to understand the semantic relationship between your products and collections. When a customer views a product:

1. The extension identifies the product being viewed
2. PathConvert's AI analyzes the product attributes, title, and description
3. The system finds the most relevant collections for that specific product
4. Smart navigation buttons appear, guiding customers to related products

## Best Practices

- **Enable on all product templates**: Add the PathConvert Buttons block to all your product page templates (default, alternate layouts, etc.)
- **Position strategically**: Place buttons where they're visible but not intrusive - typically below the product description or near related products
- **Keep collections organized**: Well-named, well-organized collections result in better AI recommendations
- **Monitor performance**: Check the PathConvert dashboard regularly to see which collection paths are most popular

## Uninstalling

If you need to remove PathConvert:

1. The theme app extension will automatically stop displaying buttons
2. Optionally, remove the PathConvert Buttons block from your theme editor
3. Uninstall the app from your Shopify admin → Apps

Your theme will not be affected - no code modifications are made to your theme files.

## Support

- **Email**: support@pathconvert.com
- **Documentation**: https://pathconvert.onrender.com/docs
- **Privacy Policy**: https://pathconvert.onrender.com/privacy

---

**Need help?** Contact our support team and we'll assist with setup and customization.
