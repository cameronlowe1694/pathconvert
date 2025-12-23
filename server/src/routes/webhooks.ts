import { Router, raw } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';

const router = Router();

/**
 * Verify Shopify webhook signature
 */
function verifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET!;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

/**
 * Webhook: APP_UNINSTALLED
 * Acknowledge app uninstallation
 *
 * IMPORTANT: We do NOT delete or clear data here to avoid race conditions.
 * Webhooks can arrive out of order - if this arrives AFTER a reinstall,
 * clearing the token would break the freshly installed app.
 *
 * Data cleanup happens in shop/redact webhook (sent 48 hours after uninstall).
 */
router.post('/app-uninstalled', raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');

    if (!hmac || !verifyWebhook(body, hmac)) {
      console.error('[Webhook] Invalid HMAC signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(body);
    const shopDomain = data.domain;

    console.log('[Webhook] App uninstalled acknowledged for shop:', shopDomain);
    console.log('[Webhook] Data will be cleaned up via shop/redact webhook in 48 hours');

    // Just acknowledge - don't clear data to avoid race conditions with reinstalls
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Error processing app-uninstalled:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * MANDATORY COMPLIANCE WEBHOOK: customers/data_request
 * Responds to customer data requests (GDPR/CPRA compliance)
 *
 * Action required: Provide customer data to the store owner within 30 days
 * Since PathConvert doesn't store personal customer data (only collection metadata),
 * we acknowledge the request but have no data to provide.
 */
router.post('/customers-data-request', raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');

    // Verify HMAC signature
    if (!hmac || !verifyWebhook(body, hmac)) {
      console.error('[Webhook] customers/data_request - Invalid HMAC signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(body);
    const { shop_domain, customer, orders_requested } = data;

    console.log('[Webhook] customers/data_request received:', {
      shop: shop_domain,
      customerId: customer?.id,
      customerEmail: customer?.email,
      ordersRequested: orders_requested?.length || 0,
    });

    // PathConvert doesn't store personal customer data:
    // - We only store collection titles, descriptions, and product metadata
    // - No customer names, emails, addresses, or order information
    // - No tracking of individual customer behavior
    //
    // Therefore, we have no personal data to provide for this request.
    // We log the request for compliance audit trail.

    // Respond immediately with 200 to acknowledge receipt
    res.status(200).json({
      message: 'Data request acknowledged. PathConvert does not store personal customer data.',
    });
  } catch (error) {
    console.error('[Webhook] Error processing customers/data_request:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * MANDATORY COMPLIANCE WEBHOOK: customers/redact
 * Responds to customer data deletion requests (GDPR/CPRA compliance)
 *
 * Action required: Delete customer data within 30 days
 * Since PathConvert doesn't store personal customer data, we acknowledge but take no action.
 */
router.post('/customers-redact', raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');

    // Verify HMAC signature
    if (!hmac || !verifyWebhook(body, hmac)) {
      console.error('[Webhook] customers/redact - Invalid HMAC signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(body);
    const { shop_domain, customer, orders_to_redact } = data;

    console.log('[Webhook] customers/redact received:', {
      shop: shop_domain,
      customerId: customer?.id,
      customerEmail: customer?.email,
      ordersToRedact: orders_to_redact?.length || 0,
    });

    // PathConvert doesn't store personal customer data:
    // - No customer records in our database
    // - No order information stored
    // - Only collection and product metadata (non-personal)
    //
    // Therefore, we have no customer data to redact/delete.
    // We log the request for compliance audit trail.

    // Respond immediately with 200 to acknowledge receipt
    res.status(200).json({
      message: 'Redaction request acknowledged. PathConvert does not store personal customer data.',
    });
  } catch (error) {
    console.error('[Webhook] Error processing customers/redact:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * MANDATORY COMPLIANCE WEBHOOK: shop/redact
 * Responds to shop data deletion requests (sent 48 hours after app uninstall)
 *
 * Action required: Delete all shop data within 30 days
 * We delete all collections, embeddings, edges, and shop records.
 */
router.post('/shop-redact', raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');

    // Verify HMAC signature
    if (!hmac || !verifyWebhook(body, hmac)) {
      console.error('[Webhook] shop/redact - Invalid HMAC signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(body);
    const { shop_id, shop_domain } = data;

    console.log('[Webhook] shop/redact received:', {
      shopId: shop_id,
      shopDomain: shop_domain,
    });

    // Find the shop record
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: shop_domain },
    });

    if (!shop) {
      console.log('[Webhook] shop/redact - Shop not found (already deleted?):', shop_domain);
      return res.status(200).json({
        message: 'Shop not found. May have been already deleted.',
      });
    }

    // Delete all shop data in correct order (respecting foreign key constraints)
    // 1. Delete edges (references collections)
    const deletedEdges = await prisma.edge.deleteMany({
      where: {
        OR: [
          { sourceCollection: { shopId: shop.id } },
          { targetCollection: { shopId: shop.id } },
        ],
      },
    });

    // 2. Delete embeddings (references collections)
    const deletedEmbeddings = await prisma.embedding.deleteMany({
      where: { collection: { shopId: shop.id } },
    });

    // 3. Delete collections
    const deletedCollections = await prisma.collection.deleteMany({
      where: { shopId: shop.id },
    });

    // 4. Delete billing records
    await prisma.billing.deleteMany({
      where: { shopId: shop.id },
    });

    // 5. Delete jobs
    await prisma.job.deleteMany({
      where: { shopId: shop.id },
    });

    // 6. Delete shop record
    await prisma.shop.delete({
      where: { id: shop.id },
    });

    console.log('[Webhook] shop/redact completed:', {
      shopDomain: shop_domain,
      deletedEdges: deletedEdges.count,
      deletedEmbeddings: deletedEmbeddings.count,
      deletedCollections: deletedCollections.count,
    });

    // Respond with 200 to confirm completion
    res.status(200).json({
      message: 'Shop data successfully deleted',
      deletedRecords: {
        edges: deletedEdges.count,
        embeddings: deletedEmbeddings.count,
        collections: deletedCollections.count,
      },
    });
  } catch (error) {
    console.error('[Webhook] Error processing shop/redact:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
