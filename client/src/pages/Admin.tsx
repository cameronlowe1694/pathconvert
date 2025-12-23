import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  ProgressBar,
  Banner,
  Button,
} from '@shopify/polaris';

interface CapacityMetrics {
  totalStores: number;
  storeLimit: number;
  storeCapacityPercent: number;
  largestStoreCollections: number;
  collectionLimit: number;
  shouldBlockSignups: boolean;
  message: string;
}

interface CapacityResponse {
  capacity: CapacityMetrics;
  recommendation: string;
}

export default function Admin() {
  const [capacity, setCapacity] = useState<CapacityMetrics | null>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCapacity();
  }, []);

  async function fetchCapacity() {
    try {
      const res = await fetch('/api/admin/capacity');
      if (res.ok) {
        const data: CapacityResponse = await res.json();
        setCapacity(data.capacity);
        setRecommendation(data.recommendation);
      }
    } catch (error) {
      console.error('Failed to fetch capacity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchCapacity();
  }

  if (loading) {
    return (
      <Page title="Infrastructure Monitoring">
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">Loading capacity metrics...</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!capacity) {
    return (
      <Page title="Infrastructure Monitoring">
        <Layout>
          <Layout.Section>
            <Banner tone="warning">
              <Text as="p">Failed to load capacity metrics.</Text>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const storeTone = capacity.shouldBlockSignups
    ? 'critical'
    : capacity.storeCapacityPercent >= 80
      ? 'warning'
      : 'success';

  const collectionTone =
    capacity.largestStoreCollections >= capacity.collectionLimit
      ? 'critical'
      : capacity.largestStoreCollections >= capacity.collectionLimit * 0.9
        ? 'warning'
        : 'success';

  return (
    <Page
      title="Infrastructure Monitoring"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
      primaryAction={{
        content: 'Refresh',
        onAction: handleRefresh,
        loading: refreshing,
      }}
    >
      <Layout>
        {capacity.shouldBlockSignups && (
          <Layout.Section>
            <Banner tone="critical">
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  🚨 URGENT: Maximum capacity reached
                </Text>
                <Text as="p">
                  New signups should be blocked. Upgrade infrastructure immediately.
                </Text>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {capacity.storeCapacityPercent >= 80 && !capacity.shouldBlockSignups && (
          <Layout.Section>
            <Banner tone="warning">
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  ⚠️ WARNING: Approaching capacity limits
                </Text>
                <Text as="p">{recommendation}</Text>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Store Capacity
              </Text>

              <BlockStack gap="200">
                <Text as="p" tone="subdued">
                  Active stores with subscriptions
                </Text>
                <ProgressBar
                  progress={capacity.storeCapacityPercent}
                  tone={storeTone}
                  size="large"
                />
                <Text as="p" variant="bodyLg" fontWeight="semibold">
                  {capacity.totalStores} / {capacity.storeLimit} stores (
                  {capacity.storeCapacityPercent}%)
                </Text>
              </BlockStack>

              {capacity.storeCapacityPercent >= 80 && (
                <Banner tone={storeTone}>
                  <Text as="p">
                    {capacity.shouldBlockSignups
                      ? 'Limit reached. Block new signups until upgrade.'
                      : 'Plan infrastructure upgrade soon.'}
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Collection Capacity
              </Text>

              <BlockStack gap="200">
                <Text as="p" tone="subdued">
                  Largest store collection count
                </Text>
                <ProgressBar
                  progress={Math.round(
                    (capacity.largestStoreCollections / capacity.collectionLimit) * 100
                  )}
                  tone={collectionTone}
                  size="large"
                />
                <Text as="p" variant="bodyLg" fontWeight="semibold">
                  {capacity.largestStoreCollections} / {capacity.collectionLimit} collections
                </Text>
              </BlockStack>

              {capacity.largestStoreCollections >= capacity.collectionLimit * 0.9 && (
                <Banner tone={collectionTone}>
                  <Text as="p">
                    One or more stores are approaching the 300 collection recommended limit for
                    current infrastructure.
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                System Status
              </Text>

              <Text as="p" tone="subdued">
                {capacity.message}
              </Text>

              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  Recommendation:
                </Text>
                <Text as="p">{recommendation}</Text>
              </BlockStack>

              {capacity.storeCapacityPercent >= 80 && (
                <>
                  <Text as="p" fontWeight="semibold">
                    Upgrade Steps:
                  </Text>
                  <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                    <li>
                      Upgrade Render database to{' '}
                      {capacity.shouldBlockSignups ? 'Professional' : 'Essential'} tier (£
                      {capacity.shouldBlockSignups ? '50' : '25'}/month)
                    </li>
                    <li>Upgrade web service to Standard tier (£25/month)</li>
                    <li>Monitor performance and adjust as needed</li>
                  </ol>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Email Alerts
              </Text>
              <Text as="p">
                Automatic email alerts are sent to <strong>cameron@pathconvert.io</strong> when:
              </Text>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li>Total stores reach 80 (80% capacity)</li>
                <li>Total stores reach 100 (100% capacity - block signups)</li>
                <li>Any store reaches 270 collections (90% capacity)</li>
              </ul>
              <Text as="p" tone="subdued">
                Alerts are triggered after analysis jobs complete or when checking capacity via
                this dashboard.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Bottom padding */}
        <Layout.Section />
      </Layout>
    </Page>
  );
}
