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
} from '@shopify/polaris';
import { getDashboardStats, startAnalysis, getAnalysisProgress } from '../utils/api';
import type { DashboardStats, AnalysisProgress } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (analyzing) {
      const interval = setInterval(async () => {
        const progressData = await getAnalysisProgress();
        setProgress(progressData);

        if (progressData.complete) {
          setAnalyzing(false);
          loadStats();
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [analyzing]);

  async function loadStats() {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    await startAnalysis();
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

  const hasButtons = stats && stats.recommendations > 0;

  if (!hasButtons && !analyzing) {
    return (
      <Page title="PathConvert">
        <EmptyState
          heading="Generate your first PLP buttons"
          action={{
            content: 'Analyze & Deploy Buttons',
            onAction: handleAnalyze,
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>AI-powered collection cross-linking to increase customer discovery and boost conversions.</p>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page
      title="PathConvert"
      subtitle="AI-powered collection cross-linking"
      primaryAction={{
        content: analyzing ? 'Analyzing...' : hasButtons ? 'Refresh Buttons' : 'Analyze & Deploy',
        onAction: handleAnalyze,
        loading: analyzing,
      }}
    >
      <Layout>
        {analyzing && progress && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {progress.status}
                </Text>
                <ProgressBar progress={progress.progress} size="small" />
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {hasButtons && !analyzing && (
          <>
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
                    Covering {stats?.collections} collections with {stats?.recommendations} active button links
                  </Text>
                  <InlineStack gap="400">
                    <Text as="p" variant="bodySm" tone="subdued">
                      AI Match Quality: {stats?.threshold.toFixed(0)}%
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Performance Snapshot
                  </Text>
                  <InlineStack gap="800">
                    <BlockStack gap="200">
                      <Text as="p" variant="headingLg">
                        {stats?.clicks || '—'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Button clicks
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="p" variant="headingLg">
                        {stats?.conversions || '—'}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Influenced conversions
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>

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
