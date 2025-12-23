# Mandatory Compliance Webhooks - Implementation Guide

## ✅ Implementation Complete

All three mandatory compliance webhooks have been implemented to pass Shopify App Store review.

## What Was Implemented

### 1. **customers/data_request** Webhook
- **Endpoint**: `POST /api/webhooks/customers-data-request`
- **Purpose**: Respond to customer data access requests (GDPR/CPRA)
- **Action**: Acknowledges request, logs for audit trail
- **Why no data**: PathConvert doesn't store personal customer data (only collection metadata)

### 2. **customers/redact** Webhook
- **Endpoint**: `POST /api/webhooks/customers-redact`
- **Purpose**: Respond to customer data deletion requests (GDPR/CPRA)
- **Action**: Acknowledges request, logs for audit trail
- **Why no deletion**: PathConvert doesn't store personal customer data

### 3. **shop/redact** Webhook
- **Endpoint**: `POST /api/webhooks/shop-redact`
- **Purpose**: Delete all shop data 48 hours after app uninstall
- **Action**: Deletes ALL shop data from database
  - Edges (recommendations graph)
  - Embeddings (AI vectors)
  - Collections
  - Billing records
  - Job records
  - Shop record

## Compliance Requirements Met

✅ **HMAC Verification**: All webhooks verify Shopify HMAC signatures
  - Returns `401 Unauthorized` if invalid signature
  - Uses `X-Shopify-Hmac-Sha256` header

✅ **POST with JSON**: Handles POST requests with `Content-Type: application/json`

✅ **200 Status Response**: Returns `200 OK` to acknowledge receipt

✅ **Audit Trail**: Logs all webhook requests with shop/customer details

✅ **Data Deletion**: `shop/redact` completely removes all shop data

## How to Pass Shopify Review

### Before Submitting Your App

1. **Ensure Render is deployed** with the latest code (already pushed to GitHub)

2. **Verify webhooks are registered** in Shopify Partners:
   - Go to: https://partners.shopify.com/4570938/apps/299346853889/distribution
   - Check "App Store review" section
   - Should show green checkmarks for:
     - ✅ Provides mandatory compliance webhooks
     - ✅ Verifies webhooks with HMAC signatures

3. **Test the webhooks** (recommended before submission):

```bash
# Test customers/data_request
curl -X POST https://pathconvert.onrender.com/api/webhooks/customers-data-request \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid" \
  -d '{"shop_domain":"test.myshopify.com","customer":{"id":123}}'

# Should return: 401 Unauthorized (HMAC verification working)

# Test with valid HMAC (use Shopify's webhook testing tool in Partners dashboard)
```

## What Data PathConvert Stores

**DOES NOT STORE** (Privacy-Safe):
- ❌ Customer names, emails, addresses
- ❌ Customer phone numbers
- ❌ Order information
- ❌ Payment details
- ❌ Customer behavior/tracking data

**DOES STORE** (Non-Personal):
- ✅ Collection titles and descriptions
- ✅ Product titles and descriptions (public catalog data)
- ✅ AI embeddings of collection content
- ✅ Recommendation graph (which collections link to which)
- ✅ Shop domain and access tokens
- ✅ Billing subscription status

This means PathConvert is **privacy-compliant by design** - no personal customer data to manage.

## Testing in Shopify Partners

### Automated Checks

Shopify automatically runs these checks:

1. **Webhook Registration Check**
   - Verifies all 3 compliance webhooks are configured
   - Checks endpoints are reachable (HTTPS with valid SSL)

2. **HMAC Verification Check**
   - Sends test webhook with invalid HMAC
   - Expects `401 Unauthorized` response
   - Sends test webhook with valid HMAC
   - Expects `200 OK` response

### Manual Testing

Use the Shopify CLI to test webhooks:

```bash
# Install Shopify CLI (if not already installed)
npm install -g @shopify/cli @shopify/app

# Test trigger (simulates webhook call)
shopify webhook trigger --topic customers/data_request --api-version 2024-10
shopify webhook trigger --topic customers/redact --api-version 2024-10
shopify webhook trigger --topic shop/redact --api-version 2024-10
```

## Troubleshooting

### "Provides mandatory compliance webhooks" failing

**Cause**: Webhooks not properly registered or endpoints not reachable

**Fix**:
1. Verify `shopify.app.toml` is in project root
2. Check Render deployment is successful
3. Ensure HTTPS is working (Render provides SSL automatically)
4. Test endpoints manually:
   ```bash
   curl https://pathconvert.onrender.com/api/webhooks/customers-data-request
   # Should respond (even if 401 due to missing HMAC)
   ```

### "Verifies webhooks with HMAC signatures" failing

**Cause**: Webhook endpoints not properly verifying HMAC header

**Fix**:
1. Ensure `SHOPIFY_API_SECRET` environment variable is set in Render
2. Check webhook handler code includes HMAC verification (already implemented)
3. Verify returns `401` when HMAC is invalid (already implemented)

### Webhooks not triggering

**Cause**: Webhook subscriptions not active

**Fix**:
1. Deploy app to Render
2. Shopify automatically registers webhooks from `shopify.app.toml`
3. Check webhook status in Shopify Partners > Your App > API access

## Next Steps

1. ✅ Code deployed to GitHub (automatic Render deployment)
2. ⏳ Wait for Render deployment to complete (~2-3 minutes)
3. 🔄 Refresh Shopify Partners review page
4. ✅ Green checkmarks should appear
5. 🚀 Click "Submit for review" button

## Support

If you encounter issues:

1. Check Render deployment logs for errors
2. Test webhook endpoints manually
3. Verify `SHOPIFY_API_SECRET` is set in Render environment
4. Use Shopify CLI to trigger test webhooks

## Files Modified

- `server/src/routes/webhooks.ts` - Added 3 compliance webhook handlers
- `shopify.app.toml` - Added webhook subscriptions configuration

## Compliance Statement for App Review

When Shopify asks about data handling during review, you can state:

> "PathConvert does not collect, store, or process personal customer data. The app only stores public catalog data (collection and product titles/descriptions) and AI-generated embeddings for recommendation purposes. Customer data request and redaction webhooks acknowledge requests but have no data to provide or delete. Shop redaction webhook fully deletes all shop data 48 hours after app uninstall."
