/**
 * Alert service for monitoring capacity and sending email notifications
 */

import prisma from '../db.js';

const ALERT_EMAIL = 'cameron@pathconvert.io';
const CAPACITY_LIMITS = {
  MAX_STORES: 100,
  MAX_COLLECTIONS_PER_STORE: 300,
  WARNING_THRESHOLD_STORES: 0.8, // Alert at 80% capacity (80 stores)
  WARNING_THRESHOLD_COLLECTIONS: 0.9, // Alert at 90% capacity (270 collections)
};

interface CapacityStatus {
  totalStores: number;
  storesAtCapacity: number;
  largestStoreCollections: number;
  largestStoreShop: string;
  isApproachingLimit: boolean;
  shouldBlockSignups: boolean;
  message: string;
}

/**
 * Check current capacity status across all stores
 */
export async function checkCapacityStatus(): Promise<CapacityStatus> {
  // Get total active stores (with active subscriptions)
  const totalStores = await prisma.shop.count({
    where: {
      subscription: {
        status: 'active',
      },
    },
  });

  // Get collection counts per store
  const storesWithCollections = await prisma.shop.findMany({
    where: {
      subscription: {
        status: 'active',
      },
    },
    select: {
      shopDomain: true,
      _count: {
        select: {
          collections: true,
        },
      },
    },
    orderBy: {
      collections: {
        _count: 'desc',
      },
    },
  });

  const storesAtCapacity = storesWithCollections.filter(
    (s) => s._count.collections >= CAPACITY_LIMITS.MAX_COLLECTIONS_PER_STORE
  ).length;

  const largestStore = storesWithCollections[0] || {
    shopDomain: 'none',
    _count: { collections: 0 },
  };

  const isApproachingStoreLimit =
    totalStores >= CAPACITY_LIMITS.MAX_STORES * CAPACITY_LIMITS.WARNING_THRESHOLD_STORES;

  const hasLargeStore =
    largestStore._count.collections >=
    CAPACITY_LIMITS.MAX_COLLECTIONS_PER_STORE * CAPACITY_LIMITS.WARNING_THRESHOLD_COLLECTIONS;

  const shouldBlockSignups = totalStores >= CAPACITY_LIMITS.MAX_STORES;

  let message = '';
  if (shouldBlockSignups) {
    message = `⛔️ CAPACITY REACHED: ${totalStores}/${CAPACITY_LIMITS.MAX_STORES} stores. New signups should be blocked.`;
  } else if (isApproachingStoreLimit) {
    message = `⚠️ WARNING: ${totalStores}/${CAPACITY_LIMITS.MAX_STORES} stores (${Math.round((totalStores / CAPACITY_LIMITS.MAX_STORES) * 100)}% capacity)`;
  } else if (hasLargeStore) {
    message = `⚠️ WARNING: Store "${largestStore.shopDomain}" has ${largestStore._count.collections} collections (${Math.round((largestStore._count.collections / CAPACITY_LIMITS.MAX_COLLECTIONS_PER_STORE) * 100)}% of limit)`;
  } else {
    message = `✅ Capacity OK: ${totalStores}/${CAPACITY_LIMITS.MAX_STORES} stores, largest has ${largestStore._count.collections} collections`;
  }

  return {
    totalStores,
    storesAtCapacity,
    largestStoreCollections: largestStore._count.collections,
    largestStoreShop: largestStore.shopDomain,
    isApproachingLimit: isApproachingStoreLimit || hasLargeStore,
    shouldBlockSignups,
    message,
  };
}

/**
 * Send email alert using simple fetch to Resend API
 * Free tier: 3,000 emails/month
 * Get API key from: https://resend.com/api-keys
 */
async function sendEmailAlert(subject: string, body: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured - skipping email alert');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PathConvert Alerts <alerts@pathconvert.io>',
        to: [ALERT_EMAIL],
        subject,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
            <h2 style="color: #dc2626;">${subject}</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${body}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated alert from your PathConvert infrastructure monitoring.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email alert:', error);
      return false;
    }

    console.log('Email alert sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email alert:', error);
    return false;
  }
}

/**
 * Check capacity and send alerts if needed
 * Call this after new store signup or analysis completion
 */
export async function checkAndAlert(): Promise<void> {
  const status = await checkCapacityStatus();

  console.log('Capacity check:', status.message);

  if (status.shouldBlockSignups) {
    await sendEmailAlert(
      '🚨 URGENT: PathConvert at Maximum Capacity',
      `
        <h3 style="color: #dc2626;">Action Required: Infrastructure upgrade needed</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li><strong>${status.totalStores}</strong> active stores (limit reached)</li>
          <li><strong>${status.storesAtCapacity}</strong> stores over 300 collections</li>
          <li>Largest store: <strong>${status.largestStoreShop}</strong> (${status.largestStoreCollections} collections)</li>
        </ul>
        <p style="margin-top: 20px; padding: 15px; background: #fee2e2; border-left: 4px solid #dc2626;">
          <strong>🛑 New signups should be blocked until you upgrade infrastructure.</strong>
        </p>
        <h4>Next Steps:</h4>
        <ol style="line-height: 1.8;">
          <li>Upgrade Render database to Professional tier (£50/month)</li>
          <li>Upgrade web service to Standard tier (£25/month)</li>
          <li>Review and optimize largest stores</li>
        </ol>
      `
    );
  } else if (status.isApproachingLimit) {
    await sendEmailAlert(
      '⚠️ PathConvert Approaching Capacity Limits',
      `
        <h3 style="color: #d97706;">Plan for upgrade soon</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li><strong>${status.totalStores}/${CAPACITY_LIMITS.MAX_STORES}</strong> active stores</li>
          <li>Largest store: <strong>${status.largestStoreShop}</strong> (${status.largestStoreCollections}/${CAPACITY_LIMITS.MAX_COLLECTIONS_PER_STORE} collections)</li>
        </ul>
        <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #d97706;">
          <strong>You're at ${Math.round((status.totalStores / CAPACITY_LIMITS.MAX_STORES) * 100)}% capacity.</strong> Consider upgrading infrastructure soon.
        </p>
        <h4>Recommended Upgrades:</h4>
        <ul style="line-height: 1.8;">
          <li>Render Database Essential: £25/month (handles up to 200 stores)</li>
          <li>Render Web Standard: £25/month (better performance)</li>
        </ul>
      `
    );
  }
}

/**
 * Get capacity status for display in admin dashboard
 */
export async function getCapacityMetrics() {
  const status = await checkCapacityStatus();
  return {
    totalStores: status.totalStores,
    storeLimit: CAPACITY_LIMITS.MAX_STORES,
    storeCapacityPercent: Math.round((status.totalStores / CAPACITY_LIMITS.MAX_STORES) * 100),
    largestStoreCollections: status.largestStoreCollections,
    collectionLimit: CAPACITY_LIMITS.MAX_COLLECTIONS_PER_STORE,
    shouldBlockSignups: status.shouldBlockSignups,
    message: status.message,
  };
}
