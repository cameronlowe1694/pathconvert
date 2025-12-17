# Shopify Partners App Configuration

## ⚠️ CRITICAL: Manual Configuration Required

Update your Shopify Partners app to work with the new Remix/Node.js codebase.

---

## 1. App Basic Settings

Navigate to: [Shopify Partners → Your Apps → PathConvert](https://partners.shopify.com/4570938/apps)

### App Details:
- **App Name**: PathConvert (or pathconvert-ai)
- **Client ID**: `fae7538a6fc12ec615cdfc413f17638f`
- **App URL**: `https://plp-linker-engine.onrender.com`

---

## 2. Update API Scopes

Navigate to: **Configuration → API access**

### ✅ Required Scopes (Minimal MVP):
```
read_products
read_content
```

### ❌ Remove These Old Scopes:
```
read_themes
write_themes
read_script_tags
write_script_tags
read_orders
read_customers
```

**Why?**
- Shopify 2.0 apps don't use script tags (deprecated)
- Theme app extensions don't require theme read/write access
- We don't need order/customer data for collection recommendations
- Minimal scopes = faster app review approval

---

## 3. Update Redirect URLs

Navigate to: **Configuration → URLs**

### App URL:
```
https://plp-linker-engine.onrender.com
```

### Allowed redirection URL(s):
```
https://plp-linker-engine.onrender.com/auth/callback
```

**⚠️ CRITICAL**: The redirect URL must **exactly match** the OAuth callback route in your Remix app.

---

## 4. Configure Webhooks

Navigate to: **Configuration → Webhooks**

### API Version:
```
2024-10 (or latest)
```

### Mandatory GDPR Webhooks:

#### 1. Customer Data Request
- **Topic**: `customers/data_request`
- **URL**: `https://plp-linker-engine.onrender.com/webhooks/customers/data_request`
- **Format**: JSON

#### 2. Customer Redaction
- **Topic**: `customers/redact`
- **URL**: `https://plp-linker-engine.onrender.com/webhooks/customers/redact`
- **Format**: JSON

#### 3. Shop Redaction
- **Topic**: `shop/redact`
- **URL**: `https://plp-linker-engine.onrender.com/webhooks/shop/redact`
- **Format**: JSON

#### 4. App Uninstalled (Optional but Recommended)
- **Topic**: `app/uninstalled`
- **URL**: `https://plp-linker-engine.onrender.com/webhooks/app/uninstalled`
- **Format**: JSON

---

## 5. App Extensions

Navigate to: **Extensions**

### Current Status:
You should see a **Theme App Extension** automatically registered from your codebase.

### Extension Details:
- **Name**: PathConvert Recommendations
- **Type**: Theme App Extension
- **Handle**: `pathconvert-recommendations`

**Note**: This will be built when we implement the Theme App Extension in the codebase.

---

## 6. Test on Development Store

Navigate to: [Your Dev Store](https://sports-clothing-test.myshopify.com/admin)

### Before Testing - Uninstall Old App:
1. Go to Settings → Apps and sales channels
2. Find PathConvert (old Python version)
3. Click "Uninstall"
4. Confirm uninstallation
5. **This removes all old broken data**

### Install Fresh:
1. In Partners dashboard, click "Test on development store"
2. Select `sports-clothing-test.myshopify.com`
3. Click "Install app"
4. Should redirect to OAuth flow
5. Approve scopes
6. Should land in embedded Polaris admin UI

---

## 7. Verify OAuth Flow

After installation, verify:

### ✅ Successful Install:
- No error messages
- Redirects to app dashboard
- Session created in database
- Shop record created

### ❌ Failed Install - Common Issues:

#### Issue: "Invalid OAuth redirect"
**Cause**: Redirect URL doesn't match Shopify settings
**Fix**: Ensure redirect URL is **exactly** `https://plp-linker-engine.onrender.com/auth/callback`

#### Issue: "Invalid scope"
**Cause**: Requested scopes don't match app configuration
**Fix**: Ensure `SCOPES` env var matches Shopify Partners: `read_products,read_content`

#### Issue: "App not responding"
**Cause**: Render deployment failed or app crashed
**Fix**: Check Render logs, fix errors, redeploy

---

## 8. Billing Configuration

Navigate to: **Configuration → Billing**

### Pricing Plans (Set These Up):

#### Monthly Plan:
- **Name**: PathConvert Starter Monthly
- **Price**: £29/month
- **Trial**: None (no free trial per spec)
- **Billing Cycle**: Every 30 days

#### Annual Plan:
- **Name**: PathConvert Starter Annual
- **Price**: £290/year (2 months free)
- **Trial**: None
- **Billing Cycle**: Every 365 days

**Note**: The app will enforce billing via Shopify Billing API before allowing features.

---

## 9. App Listing (Future - App Store Submission)

### For Public Release:
1. Complete all features and testing
2. Update app listing with screenshots, description
3. Submit for Shopify review
4. Address any review feedback
5. Publish to Shopify App Store

### Review Requirements Checklist:
- ✅ GDPR webhooks configured
- ✅ Privacy policy URL provided
- ✅ Minimal necessary scopes only
- ✅ No script tags or theme editing
- ✅ Uses Theme App Extension (Shopify 2.0)
- ✅ Billing implemented
- ✅ Handles errors gracefully
- ✅ Mobile responsive UI

---

## 10. Shopify CLI Integration

For local development with Shopify CLI:

```bash
# Link to existing app
shopify app config link

# Run dev server with tunneling
shopify app dev

# Deploy to production
shopify app deploy
```

**Dev Store**: `sports-clothing-test.myshopify.com` (already configured in `shopify.app.toml`)

---

## 11. Next Steps

### After Shopify Configuration:
1. ✅ Render deployed and running
2. ✅ Shopify app settings updated
3. 🔄 Uninstall old app from dev store
4. 🔄 Install fresh and test OAuth flow
5. 🔄 Build and test MVP features

---

## 12. Common Shopify Setup Mistakes

### ❌ Don't Do This:
- Keep old script_tags/theme scope (causes review rejection)
- Use ngrok or temporary URLs (breaks when tunnel closes)
- Skip GDPR webhooks (mandatory for public apps)
- Request unnecessary scopes (causes review delays)

### ✅ Do This:
- Use Render production URL for all testing
- Minimal scopes only
- GDPR compliance from day one
- Theme App Extension instead of script tags
- Test thoroughly on dev store before submitting

---

**🚨 Complete Shopify configuration before testing app installation!**
