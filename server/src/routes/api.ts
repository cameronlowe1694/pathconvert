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
    const { maxButtons, buttonStyle } = req.body;

    // Validate
    if (maxButtons !== undefined && (maxButtons < 1 || maxButtons > 30)) {
      return res.status(400).json({ error: 'maxButtons must be between 1 and 30' });
    }

    if (buttonStyle !== undefined && !['pill', 'rounded', 'square'].includes(buttonStyle)) {
      return res.status(400).json({ error: 'Invalid buttonStyle' });
    }

    const settings = await prisma.settings.update({
      where: { shopId },
      data: {
        ...(maxButtons !== undefined && { maxButtons }),
        ...(buttonStyle !== undefined && { buttonStyle }),
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

export default router;
