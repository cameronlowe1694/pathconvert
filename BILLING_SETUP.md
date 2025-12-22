# Billing Setup Instructions

## Overview
The billing implementation is complete and deployed. However, to enable Shopify's Billing API, you need to update your OAuth scopes.

## Required OAuth Scopes

**IMPORTANT:** For app billing (charging merchants for your app), you do NOT need special billing scopes!

Your current scopes are correct:
```
SCOPES=read_products,read_content
```

**DO NOT add billing-related scopes.** The `appSubscriptionCreate` mutation works automatically with standard Admin API access.

### Why No Special Scopes?

According to [Shopify's billing documentation](https://shopify.dev/docs/apps/launch/billing):
- App billing mutations (`appSubscriptionCreate`, `appSubscriptionCancel`) don't require special scopes
- They work with any app that has Admin API access
- Special scopes are only needed for subscription products (helping merchants sell subscriptions to customers)

### Current Configuration

Your `.env` file and Render environment should have:
```bash
SCOPES=read_products,read_content
```

### Shopify Partner Dashboard

- Go to https://partners.shopify.com/4570938/apps/299346853889/edit
- Under "API access" → "Admin API access scopes"
- Only enable:
  - ✅ `read_products` - For fetching collection data
  - ✅ `read_content` - For reading collection content
- **DO NOT enable any payment-related scopes** - they are not needed and some don't exist

## No Re-authorization Required

Since your scopes haven't changed, you don't need to:
- ❌ Uninstall/reinstall the app
- ❌ Re-authorize existing installations
- ❌ Update any environment variables

Your billing implementation will work with your current setup!

## Testing Billing Flow

### Test Mode (Development)
- The billing API creates test charges (won't charge real money)
- Set `NODE_ENV=development` in environment variables
- Test charges appear in Shopify admin under "Apps" → "Recurring app charges"

### Production Mode
- Set `NODE_ENV=production`
- Real charges will be created
- Shopify takes 20% commission on app revenue

## Pricing Structure

### Monthly Plan
- **Price:** £29/month
- **Billing:** Every 30 days
- **All features included**

### Annual Plan
- **Price:** £290/year
- **Billing:** Annual
- **Savings:** £58 compared to monthly (2 months free)
- **Benefits:** Priority support, early feature access

## API Endpoints

### GET /api/billing
Returns current billing status for the shop.

**Response:**
```json
{
  "billing": {
    "plan": "pathconvert",
    "interval": "monthly",
    "status": "active",
    "currentPeriodEnd": "2025-02-22T00:00:00.000Z",
    "shopifySubscriptionId": "gid://shopify/AppSubscription/123"
  }
}
```

### POST /api/billing/subscribe
Creates a new subscription.

**Request:**
```json
{
  "interval": "monthly" // or "annual"
}
```

**Response:**
```json
{
  "confirmationUrl": "https://admin.shopify.com/charges/...",
  "subscriptionId": "gid://shopify/AppSubscription/123"
}
```

### POST /api/billing/cancel
Cancels the active subscription.

**Response:**
```json
{
  "message": "Subscription cancelled successfully"
}
```

## Subscription Flow

1. **User clicks "Subscribe Monthly" or "Subscribe Annually"**
   - Frontend calls POST /api/billing/subscribe
   - Backend creates Shopify subscription via GraphQL
   - Returns `confirmationUrl`

2. **User redirected to Shopify confirmation page**
   - Shopify shows subscription details
   - User accepts charge
   - Shopify redirects back to app

3. **Shopify webhook confirms subscription**
   - Backend receives webhook (need to implement)
   - Updates billing status to "active"
   - User can now use premium features

4. **Entitlement check on each request**
   - `getEntitlement(shopId)` checks billing status
   - Returns `canRunJobs` and `canRenderButtons` flags
   - Gates premium features

## Webhooks (To Implement)

You'll need to set up these webhooks to keep billing status in sync:

### APP_SUBSCRIPTIONS_UPDATE
Triggered when subscription status changes.

**Handler:** Update billing status in database

### APP_UNINSTALLED
Triggered when app is uninstalled.

**Handler:** Clean up shop data, cancel subscriptions

## Frontend Components

### Billing Page ([Billing.tsx](client/src/pages/Billing.tsx))
- Side-by-side plan cards
- Current plan badge
- Subscription management (subscribe, cancel, switch plans)
- FAQ section

### Dashboard Integration
- Warning banner when no subscription
- "View Plans" link in banner
- "Billing" in secondary navigation
- "Analyse & Deploy" button disabled without subscription

## Database Schema

The `Billing` table tracks subscription state:

```prisma
model Billing {
  id                    String    @id @default(uuid())
  shopId                String    @unique
  shop                  Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)

  plan                  String    // "pathconvert"
  interval              String    // "monthly" or "annual"
  status                String    // "active", "cancelled", "frozen"
  shopifySubscriptionId String?
  currentPeriodEnd      DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

## Testing Checklist

- [ ] Update SCOPES in .env
- [ ] Update SCOPES in Render
- [ ] Update scopes in Shopify Partner Dashboard
- [ ] Uninstall/reinstall app to re-authorize
- [ ] Navigate to /billing page
- [ ] Click "Subscribe Monthly" - confirms redirect to Shopify
- [ ] Accept charge in Shopify admin
- [ ] Verify billing status shows "active"
- [ ] Verify "Analyse & Deploy" button now enabled
- [ ] Test cancellation flow
- [ ] Test switching between monthly/annual

## Next Steps

1. **Update OAuth scopes** (see above)
2. **Implement webhooks** for subscription lifecycle events
3. **Test billing flow** with test store
4. **Monitor Shopify Partner Dashboard** for charge approvals
5. **Set up Stripe/banking** to receive payouts from Shopify

## Support

For billing API issues, refer to:
- [Shopify Billing API docs](https://shopify.dev/docs/apps/billing)
- [App subscriptions](https://shopify.dev/docs/apps/billing/subscriptions)
