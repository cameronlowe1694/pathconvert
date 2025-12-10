import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  SkeletonPage,
  SkeletonBodyText,
  EmptyState,
  ProgressBar,
  Divider,
} from '@shopify/polaris';
import {
  fetchDashboardStats,
  generateButtonsForAllCollections,
  getAnalysisProgress,
  fetchActivityLog,
} from '../utils/api';
import type { DashboardStats, AnalysisProgress, ActivityLog } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (generating) {
      const interval = setInterval(async () => {
        const progressData = await getAnalysisProgress();
        setProgress(progressData);

        if (progressData.complete) {
          setGenerating(false);
          setShowSummary(true);
          await loadDashboard();
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [generating]);

  async function loadDashboard() {
    try {
      const [statsData, logData] = await Promise.all([
        fetchDashboardStats(),
        fetchActivityLog(),
      ]);
      setStats(statsData);
      setActivityLog(logData);

      // Show summary only if buttons actually exist
      if (statsData.totalButtons > 0) {
        setShowSummary(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setShowSummary(false);
    await generateButtonsForAllCollections();
  }

  async function handleRefresh() {
    setShowSummary(false);
    setGenerating(true);
    await generateButtonsForAllCollections();
  }

  if (loading) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonBodyText />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const hasButtons = stats && stats.totalButtons > 0;

  // Empty state - no buttons generated yet
  if (!hasButtons && !generating && !showSummary) {
    return (
      <Page title="PathConvert">
        <EmptyState
          heading="Generate your first PLP buttons"
          action={{
            content: '🚀 Analyze & Deploy Buttons',
            onAction: handleGenerate,
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            AI-powered collection cross-linking to increase customer discovery and boost
            conversions.
          </p>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page
      title="PathConvert"
      subtitle="AI-powered PLP buttons that boost conversions"
    >
      <Layout>
        {/* Analysis in progress */}
        {generating && progress && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {progress.status}
                </Text>
                <ProgressBar progress={progress.progress} size="medium" tone="primary" />
                <Text as="p" variant="bodySm" tone="subdued">
                  Analyzing collections with OpenAI...
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Success summary after analysis */}
        {showSummary && !generating && hasButtons && (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      ✓ Buttons Deployed Successfully
                    </Text>
                    <InlineStack gap="200">
                      <Button disabled size="slim" tone="success">
                        ✓ Deployed
                      </Button>
                      <Button onClick={handleRefresh} size="slim" tone="critical">
                        🔄 Re-run Analysis
                      </Button>
                    </InlineStack>
                  </InlineStack>

                  <InlineStack gap="800">
                    <BlockStack gap="200">
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {stats?.collectionsWithButtons || 0}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Collection Pages
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {stats?.totalButtons || 0}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Active Button Links
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        50%
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        AI Match Quality
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="300">
                    <Text as="p" variant="headingSm" fontWeight="semibold">
                      Next Steps:
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm">
                        • Visit your collection pages to see the recommendation buttons live
                      </Text>
                      <Text as="p" variant="bodySm">
                        • Add new collections anytime and click "Re-run Analysis" to update
                      </Text>
                      <Text as="p" variant="bodySm">
                        • Buttons automatically update when you re-analyze your store
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Status Card */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Status
                    </Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    Covering {stats?.collectionsWithButtons || 0} collections with{' '}
                    {stats?.totalButtons || 0} active button links
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    AI Match Quality: 50%
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Performance Snapshot */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Performance Snapshot
                  </Text>
                  <InlineStack gap="800">
                    <BlockStack gap="200">
                      <Text as="p" variant="headingLg">
                        {stats?.buttonClicks || '—'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Button clicks
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="p" variant="headingLg">
                        {stats?.influencedConversions || '—'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Influenced conversions
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Quick Actions */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  <InlineStack gap="300">
                    <Button url="/buttons">View All Buttons</Button>
                    <Button url="/settings/ai">AI Settings</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </>
        )}
      </Layout>
    </Page>
  );
}
