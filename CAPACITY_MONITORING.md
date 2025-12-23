# Capacity Monitoring & Alerts

This document explains the capacity monitoring system for PathConvert.

## Overview

The system monitors:
- **Total active stores**: Max 100 stores before infrastructure upgrade needed
- **Collections per store**: Max 300 collections recommended per store
- **Email alerts**: Sent to cameron@pathconvert.io when approaching limits

## Setup

### 1. Sign up for Resend (Free Email Service)

1. Go to https://resend.com/signup
2. Create a free account (3,000 emails/month free)
3. Verify your email domain:
   - Go to https://resend.com/domains
   - Add domain: `pathconvert.io`
   - Add the DNS records provided by Resend to your domain
   - Wait for verification (usually 5-15 minutes)

### 2. Get API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it: `PathConvert Alerts`
4. Select permissions: `Sending access`
5. Copy the API key (starts with `re_...`)

### 3. Add to Render Environment Variables

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your PathConvert web service
3. Go to "Environment" tab
4. Add new environment variable:
   - Key: `RESEND_API_KEY`
   - Value: `re_...` (paste your API key)
5. Click "Save Changes"
6. Render will automatically redeploy

## How It Works

### Automatic Alerts

Alerts are automatically sent when:

1. **80% capacity (80 stores)**
   - ⚠️ Warning email sent
   - Subject: "PathConvert Approaching Capacity Limits"
   - Recommendation: Plan upgrade soon

2. **100% capacity (100 stores)**
   - 🚨 Critical email sent
   - Subject: "URGENT: PathConvert at Maximum Capacity"
   - Recommendation: Upgrade infrastructure immediately

3. **Store with 270+ collections (90% of 300)**
   - ⚠️ Warning email sent
   - Lists the store domain and collection count

### Trigger Points

Alerts are checked:
- After every successful "Analyse & Deploy" job
- When viewing the `/admin` capacity dashboard
- When calling `/api/admin/capacity` endpoint

### Admin Dashboard

Access the capacity monitoring dashboard:

**URL**: `https://your-app-url.com/admin?shop=yourstore.myshopify.com`

The dashboard shows:
- Store capacity (X/100 stores)
- Collection capacity (largest store)
- Current status and recommendations
- Upgrade steps when needed

## Email Alert Examples

### Warning Email (80% capacity)

```
Subject: ⚠️ PathConvert Approaching Capacity Limits

Plan for upgrade soon

• 82/100 active stores
• Largest store: example-store.myshopify.com (245/300 collections)

You're at 82% capacity. Consider upgrading infrastructure soon.

Recommended Upgrades:
• Render Database Essential: £25/month (handles up to 200 stores)
• Render Web Standard: £25/month (better performance)
```

### Critical Email (100% capacity)

```
Subject: 🚨 URGENT: PathConvert at Maximum Capacity

Action Required: Infrastructure upgrade needed

• 100 active stores (limit reached)
• 3 stores over 300 collections
• Largest store: big-store.myshopify.com (487 collections)

🛑 New signups should be blocked until you upgrade infrastructure.

Next Steps:
1. Upgrade Render database to Professional tier (£50/month)
2. Upgrade web service to Standard tier (£25/month)
3. Review and optimize largest stores
```

## Monitoring Without Alerts

If you don't want to set up email alerts yet, you can still monitor capacity:

1. Visit `/admin` dashboard regularly
2. Check the console logs after analysis jobs:
   ```
   Capacity check: ✅ Capacity OK: 45/100 stores, largest has 128 collections
   ```

3. Call the API endpoint manually:
   ```bash
   curl https://your-app.com/api/admin/capacity \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

## Capacity Limits

### Current Infrastructure (Free/Starter Tier)

- **Max stores**: 100
- **Max collections per store**: 300
- **Warning threshold**: 80 stores (80%)
- **Collection warning**: 270 collections (90%)

### After Upgrade (Essential Tier - £50/month)

- **Max stores**: 200+
- **Max collections per store**: 500
- Better database performance
- More concurrent requests

### Enterprise Scale (Professional Tier + Job Queue)

- **Max stores**: 500+
- **Max collections per store**: 1,000+
- Requires custom development (£5k-8k one-time)
- Running cost: £1,700-2,650/month

## Disabling Alerts

If you want to disable email alerts temporarily:

1. Remove `RESEND_API_KEY` environment variable from Render
2. Alerts will be logged to console only
3. Dashboard will still work

## Testing Alerts

To test that alerts are working:

1. Make sure `RESEND_API_KEY` is set in Render
2. Run an analysis job on your test store
3. Check the Render logs for:
   ```
   Capacity check: ✅ Capacity OK: 1/100 stores...
   Email alert sent successfully
   ```
4. Check cameron@pathconvert.io for the email

## Support

If alerts aren't working:

1. Check Render logs for errors:
   ```
   RESEND_API_KEY not configured - skipping email alert
   Failed to send email alert: [error message]
   ```

2. Verify API key is correct in Render environment variables

3. Check Resend dashboard for email delivery status:
   https://resend.com/emails

4. Verify domain DNS records are configured correctly:
   https://resend.com/domains
