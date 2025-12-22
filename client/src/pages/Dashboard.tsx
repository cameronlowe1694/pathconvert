import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  ProgressBar,
  Link,
  Tooltip,
  Icon,
} from '@shopify/polaris';
import { QuestionMarkMinor } from '@shopify/polaris-icons';

interface DashboardProps {
  shop: string;
}

interface ShopData {
  shop: {
    id: string;
    domain: string;
    lastAnalysedAt: string | null;
    cacheVersion: number;
  };
  settings: any;
  billing: any;
  entitlement: {
    canRunJobs: boolean;
    canRenderButtons: boolean;
    status: string;
  };
  metrics: {
    totalCollections: number;
    enabledCollections: number;
    totalButtons: number;
  };
}

interface JobStatus {
  id: string;
  type: string;
  status: string;
  progressPercent: number;
  step: string | null;
  errorMessage: string | null;
}

export default function Dashboard({ shop }: DashboardProps) {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // Fetch shop data
  useEffect(() => {
    fetchShopData();
  }, []);

  // Poll job status if job is running
  useEffect(() => {
    if (jobId && jobStatus?.status !== 'complete' && jobStatus?.status !== 'failed') {
      const interval = setInterval(() => {
        fetchJobStatus(jobId);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus?.status]);

  async function fetchShopData() {
    try {
      const res = await fetch('/api/shop');
      if (res.ok) {
        const data = await res.json();
        setShopData(data);
      }
    } catch (error) {
      console.error('Failed to fetch shop data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJobStatus(id: string) {
    try {
      const res = await fetch(`/api/job-status/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJobStatus(data);

        if (data.status === 'complete') {
          setAnalysing(false);
          fetchShopData(); // Refresh shop data
        } else if (data.status === 'failed') {
          setAnalysing(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  }

  async function handleAnalyseDeploy() {
    setAnalysing(true);

    try {
      const res = await fetch('/api/analyse-deploy', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setJobId(data.jobId);
        setJobStatus({
          id: data.jobId,
          type: 'ANALYSE_DEPLOY',
          status: 'pending',
          progressPercent: 0,
          step: null,
          errorMessage: null,
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to start analysis');
        setAnalysing(false);
      }
    } catch (error) {
      console.error('Analyse deploy error:', error);
      alert('Failed to start analysis');
      setAnalysing(false);
    }
  }

  if (loading) {
    return (
      <Page title="PathConvert">
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">Loading...</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!shopData) {
    return (
      <Page title="PathConvert">
        <Layout>
          <Layout.Section>
            <Banner tone="critical">Failed to load shop data</Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { entitlement } = shopData;
  const needsSubscription = !entitlement.canRunJobs;
  const isDevelopmentMode = entitlement.status === 'development';

  return (
    <Page
      title="PathConvert"
      subtitle="AI-Powered Collection Recommendations"
      primaryAction={{
        content: 'Analyse & Deploy',
        onAction: handleAnalyseDeploy,
        loading: analysing,
        disabled: analysing || needsSubscription,
      }}
      secondaryActions={[
        { content: 'Manage Collections', url: '/collections' },
        { content: 'Settings', url: '/settings' },
        { content: 'Plans & Billing', url: '/billing' },
      ]}
    >
      <Layout>
        {isDevelopmentMode && (
          <Layout.Section>
            <Banner tone="info">
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  Development Mode Active
                </Text>
                <Text as="p">
                  Billing checks are disabled for development stores. All features are available for testing.
                </Text>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {needsSubscription && !isDevelopmentMode && (
          <Layout.Section>
            <Banner tone="warning">
              <BlockStack gap="200">
                <Text as="p">
                  Active subscription required to run analysis and display recommendations.
                </Text>
                <InlineStack>
                  <Link url="/billing">View Plans</Link>
                </InlineStack>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {jobStatus && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Analysis Progress
                </Text>
                <ProgressBar progress={jobStatus.progressPercent} />
                <InlineStack align="space-between">
                  <Text as="p" tone="subdued">
                    {jobStatus.step || 'Queued...'}
                  </Text>
                  <Text as="p" tone="subdued">
                    {jobStatus.progressPercent}%
                  </Text>
                </InlineStack>
                {jobStatus.status === 'complete' && (
                  <Banner tone="success">Analysis complete!</Banner>
                )}
                {jobStatus.status === 'failed' && (
                  <Banner tone="critical">
                    Analysis failed: {jobStatus.errorMessage}
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Start
              </Text>
              <BlockStack gap="200">
                <Text as="p">1. Click "Analyse & Deploy" to generate recommendations</Text>
                <Text as="p">2. Manage which collections show recommendations in Manage Collections</Text>
                <Text as="p">3. Customize button appearance in Settings</Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Status
              </Text>
              <InlineStack gap="400" wrap={true}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Text as="p" tone="subdued">
                    Last Analysis
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shopData.shop.lastAnalysedAt
                      ? new Date(shopData.shop.lastAnalysedAt).toLocaleString()
                      : 'Never'}
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Text as="p" tone="subdued">
                    Subscription Status
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {entitlement.canRunJobs ? 'Active' : 'Inactive'}
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <InlineStack gap="100" blockAlign="center">
                    <Text as="p" tone="subdued">
                      Cache Version
                    </Text>
                    <Tooltip content="Increments each time you run Analyse & Deploy. Used to ensure fresh recommendations are served.">
                      <Icon source={QuestionMarkMinor} tone="base" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    {shopData.shop.cacheVersion}
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Text as="p" tone="subdued">
                    Enabled Collections
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shopData.metrics.enabledCollections} / {shopData.metrics.totalCollections}
                  </Text>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Text as="p" tone="subdued">
                    Total Buttons Live
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shopData.metrics.totalButtons}
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How It Works
              </Text>
              <BlockStack gap="200">
                <Text as="p">
                  PathConvert uses OpenAI embeddings to analyze your collection descriptions
                  and automatically generate relevant recommendations.
                </Text>
                <Text as="p">
                  Recommendations appear on collection pages via the app proxy, helping
                  customers discover related products.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                We Love Your Feedback
              </Text>
              <Text as="p">
                Help us make PathConvert the ultimate one-click solution for all clients! Share your thoughts, suggestions, or feature requests with us.
              </Text>
              <InlineStack>
                <Link url="mailto:feedback@pathconvert.com" external>
                  feedback@pathconvert.com
                </Link>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
