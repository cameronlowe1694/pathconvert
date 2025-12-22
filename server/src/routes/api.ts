import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../db.js';
import { createJob, getJobStatus } from '../services/jobQueue.js';
import { getEntitlement } from '../services/entitlement.js';

const router = Router();

// Apply authentication to all API routes
router.use(authenticate);

// GET /api/shop - Get shop info
router.get('/shop', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopDomain: true,
        lastAnalysedAt: true,
        cacheVersion: true,
        settings: true,
        billing: true,
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get entitlement
    const entitlement = await getEntitlement(shopId);

    // Get metrics
    const totalCollections = await prisma.collection.count({
      where: { shopId },
    });

    const enabledCollections = await prisma.collection.count({
      where: { shopId, isEnabled: true },
    });

    // Count total buttons (edges from enabled collections)
    const totalButtons = await prisma.edge.count({
      where: {
        sourceCollection: {
          shopId,
          isEnabled: true,
        },
      },
    });

    res.json({
      shop: {
        id: shop.id,
        domain: shop.shopDomain,
        lastAnalysedAt: shop.lastAnalysedAt,
        cacheVersion: shop.cacheVersion,
      },
      settings: shop.settings,
      billing: shop.billing,
      entitlement,
      metrics: {
        totalCollections,
        enabledCollections,
        totalButtons,
      },
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Failed to get shop info' });
  }
});

// POST /api/analyse-deploy - Trigger analysis and deployment
router.post('/analyse-deploy', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    // Check entitlement
    const entitlement = await getEntitlement(shopId);
    if (!entitlement.canRunJobs) {
      return res.status(403).json({
        error: 'Active subscription required',
        status: entitlement.status,
      });
    }

    // Create job
    const job = await createJob(shopId, 'ANALYSE_DEPLOY');

    res.json({
      jobId: job.id,
      status: job.status,
      message: 'Analysis job created',
    });
  } catch (error) {
    console.error('Analyse deploy error:', error);
    res.status(500).json({ error: 'Failed to create analysis job' });
  }
});

// GET /api/job-status/:id - Get job status
router.get('/job-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;

    const job = await getJobStatus(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify job belongs to this shop
    const jobWithShop = await prisma.job.findUnique({
      where: { id },
      select: { shopId: true },
    });

    if (jobWithShop?.shopId !== authReq.shopId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// GET /api/collections - List collections
router.get('/collections', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    const collections = await prisma.collection.findMany({
      where: { shopId },
      select: {
        id: true,
        shopifyCollectionId: true,
        handle: true,
        title: true,
        descriptionText: true,
        genderCategory: true,
        isEnabled: true,
        isExcludedSale: true,
        updatedAtShopify: true,
        embedding: {
          select: {
            id: true,
            embeddingModel: true,
          },
        },
        _count: {
          select: {
            sourceEdges: true,
            targetEdges: true,
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    res.json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

// POST /api/collections/:id/toggle - Toggle collection enabled status
router.post('/collections/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;

    // Verify collection belongs to this shop
    const collection = await prisma.collection.findFirst({
      where: { id, shopId: authReq.shopId },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Toggle enabled status
    const updated = await prisma.collection.update({
      where: { id },
      data: { isEnabled: !collection.isEnabled },
    });

    res.json({ collection: updated });
  } catch (error) {
    console.error('Toggle collection error:', error);
    res.status(500).json({ error: 'Failed to toggle collection' });
  }
});

// GET /api/settings - Get settings
router.get('/settings', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    const settings = await prisma.settings.findUnique({
      where: { shopId },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// POST /api/settings - Update settings
router.post('/settings', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;
    const { maxButtons, buttonStyle, alignment } = req.body;

    // Validate
    if (maxButtons !== undefined && (maxButtons < 1 || maxButtons > 30)) {
      return res.status(400).json({ error: 'maxButtons must be between 1 and 30' });
    }

    if (buttonStyle !== undefined && !['pill', 'rounded', 'square'].includes(buttonStyle)) {
      return res.status(400).json({ error: 'Invalid buttonStyle' });
    }

    if (alignment !== undefined && !['left', 'center', 'right'].includes(alignment)) {
      return res.status(400).json({ error: 'Invalid alignment' });
    }

    const settings = await prisma.settings.update({
      where: { shopId },
      data: {
        ...(maxButtons !== undefined && { maxButtons }),
        ...(buttonStyle !== undefined && { buttonStyle }),
        ...(alignment !== undefined && { alignment }),
      },
    });

    res.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/cleanup - Cleanup deleted collections and rebuild
router.post('/cleanup', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;
    const { removeDeletedTargets = false, rebuildEmbeddings = false } = req.body;

    // Check entitlement
    const entitlement = await getEntitlement(shopId);
    if (!entitlement.canRunJobs) {
      return res.status(403).json({
        error: 'Active subscription required',
        status: entitlement.status,
      });
    }

    let deletedCount = 0;

    if (removeDeletedTargets) {
      // Find edges pointing to disabled/excluded collections
      const edges = await prisma.edge.findMany({
        where: {
          sourceCollection: { shopId },
          targetCollection: {
            OR: [
              { isEnabled: false },
              { isExcludedSale: true },
            ],
          },
        },
      });

      // Delete these edges
      if (edges.length > 0) {
        await prisma.edge.deleteMany({
          where: {
            id: { in: edges.map((e: any) => e.id) },
          },
        });
        deletedCount = edges.length;
      }
    }

    if (rebuildEmbeddings) {
      // Create job to rebuild everything
      const job = await createJob(shopId, 'ANALYSE_DEPLOY');
      return res.json({
        message: 'Cleanup complete, rebuild job created',
        deletedEdges: deletedCount,
        jobId: job.id,
      });
    }

    res.json({
      message: 'Cleanup complete',
      deletedEdges: deletedCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

// GET /api/billing - Get billing info
router.get('/billing', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    const billing = await prisma.billing.findUnique({
      where: { shopId },
    });

    res.json({ billing });
  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ error: 'Failed to get billing info' });
  }
});

// POST /api/billing/subscribe - Create Shopify subscription
router.post('/billing/subscribe', async (req, res) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { shopId } = authReq;
    const { interval } = req.body;

    if (!['monthly', 'annual'].includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval. Must be monthly or annual' });
    }

    // Get shop to retrieve access token
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Define pricing
    const pricing = {
      monthly: { amount: 29, currencyCode: 'GBP' },
      annual: { amount: 290, currencyCode: 'GBP' },
    };

    const selectedPricing = pricing[interval as 'monthly' | 'annual'];

    // Create subscription using Shopify Billing API
    // Using direct fetch instead of @shopify/shopify-api GraphQL client to avoid 401 errors
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      name: `PathConvert ${interval === 'annual' ? 'Annual' : 'Monthly'} Plan`,
      returnUrl: `${process.env.APP_URL}/billing?charge_id={CHARGE_ID}`,
      test: process.env.NODE_ENV !== 'production',
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: selectedPricing.amount, currencyCode: selectedPricing.currencyCode },
              interval: interval === 'annual' ? 'ANNUAL' : 'EVERY_30_DAYS',
            },
          },
        },
      ],
    };

    console.log('[Billing] Creating subscription with direct fetch to avoid GraphQL client 401 errors');
    console.log('[Billing] Test mode:', process.env.NODE_ENV !== 'production');

    // Use direct fetch with X-Shopify-Access-Token header (official Shopify API pattern)
    const graphqlResponse = await fetch(`https://${shop.shopDomain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('[Billing] GraphQL request failed:', graphqlResponse.status, errorText);
      return res.status(graphqlResponse.status).json({
        error: `Shopify API request failed: ${graphqlResponse.statusText}`
      });
    }

    const response = await graphqlResponse.json() as any;

    if (response.errors) {
      console.error('[Billing] GraphQL errors:', response.errors);
      return res.status(400).json({
        error: response.errors[0]?.message || 'GraphQL request failed'
      });
    }

    const { appSubscriptionCreate } = response.data;

    if (appSubscriptionCreate.userErrors?.length > 0) {
      console.error('Shopify billing errors:', appSubscriptionCreate.userErrors);
      return res.status(400).json({
        error: appSubscriptionCreate.userErrors[0].message,
      });
    }

    // Store pending subscription in database
    await prisma.billing.upsert({
      where: { shopId },
      create: {
        shopId,
        plan: 'pathconvert',
        interval,
        status: 'pending',
        shopifySubscriptionId: appSubscriptionCreate.appSubscription.id,
      },
      update: {
        interval,
        status: 'pending',
        shopifySubscriptionId: appSubscriptionCreate.appSubscription.id,
      },
    });

    res.json({
      confirmationUrl: appSubscriptionCreate.confirmationUrl,
      subscriptionId: appSubscriptionCreate.appSubscription.id,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/billing/cancel - Cancel subscription
router.post('/billing/cancel', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    const billing = await prisma.billing.findUnique({
      where: { shopId },
    });

    if (!billing || !billing.shopifySubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Get shop to retrieve access token
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Cancel subscription via Shopify API
    // Using direct fetch instead of @shopify/shopify-api GraphQL client to avoid 401 errors
    const mutation = `
      mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    console.log('[Billing] Cancelling subscription with direct fetch');

    // Use direct fetch with X-Shopify-Access-Token header (official Shopify API pattern)
    const graphqlResponse = await fetch(`https://${shop.shopDomain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { id: billing.shopifySubscriptionId },
      }),
    });

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('[Billing] GraphQL cancel request failed:', graphqlResponse.status, errorText);
      return res.status(graphqlResponse.status).json({
        error: `Shopify API request failed: ${graphqlResponse.statusText}`
      });
    }

    const response = await graphqlResponse.json() as any;

    if (response.errors) {
      console.error('[Billing] GraphQL cancel errors:', response.errors);
      return res.status(400).json({
        error: response.errors[0]?.message || 'GraphQL request failed'
      });
    }

    const { appSubscriptionCancel } = response.data;

    if (appSubscriptionCancel.userErrors?.length > 0) {
      console.error('Shopify cancel errors:', appSubscriptionCancel.userErrors);
      return res.status(400).json({
        error: appSubscriptionCancel.userErrors[0].message,
      });
    }

    // Update billing status
    await prisma.billing.update({
      where: { shopId },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// DELETE /api/admin/delete-shop - Delete shop and all related data (for testing/reinstallation)
// WARNING: This is a destructive operation - use with caution
router.delete('/admin/delete-shop', async (req, res) => {
  try {
    const { shopId } = req as AuthenticatedRequest;

    console.log('[Admin] Deleting shop and all related data:', shopId);

    // Delete shop (cascade will delete all related records)
    await prisma.shop.delete({
      where: { id: shopId },
    });

    console.log('[Admin] Shop deleted successfully');

    res.json({ message: 'Shop and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
});

export default router;
