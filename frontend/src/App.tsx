import { useState, useEffect } from 'react';
import { AppProvider, Page, Card, EmptyState, Button, Text } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

export default function App() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get('shop') || 'sports-clothing-test.myshopify.com';

      const response = await fetch(`/api/simple/debug?shop=${shop}`);
      const data = await response.json();

      setStats({
        totalButtons: data.count.recommendations,
        totalCollections: data.count.collections,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop') || 'sports-clothing-test.myshopify.com';

    await fetch(`/api/simple/analyze?shop=${shop}`, { method: 'POST' });
    window.location.reload();
  }

  if (loading) {
    return (
      <AppProvider i18n={{}}>
        <Page title="PathConvert">
          <Card>
            <Text as="p">Loading...</Text>
          </Card>
        </Page>
      </AppProvider>
    );
  }

  const hasButtons = stats && stats.totalButtons > 0;

  if (!hasButtons) {
    return (
      <AppProvider i18n={{}}>
        <Page title="PathConvert">
          <EmptyState
            heading="Generate your first PLP buttons"
            action={{
              content: '🚀 Analyze & Deploy Buttons',
              onAction: handleAnalyze,
            }}
          >
            <p>AI-powered collection cross-linking to boost conversions.</p>
          </EmptyState>
        </Page>
      </AppProvider>
    );
  }

  return (
    <AppProvider i18n={{}}>
      <Page title="PathConvert">
        <Card>
          <Text as="h2" variant="headingLg">
            ✓ Buttons Deployed Successfully
          </Text>
          <Text as="p">
            {stats.totalCollections} collections with {stats.totalButtons} active buttons
          </Text>
          <Button onClick={handleAnalyze}>🔄 Re-run Analysis</Button>
        </Card>
      </Page>
    </AppProvider>
  );
}
