import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Checkbox,
  FormLayout,
  Banner,
} from '@shopify/polaris';
import { startAnalysis } from '../utils/api';

export default function SyncPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [cleanupDeletedTargets, setCleanupDeletedTargets] = useState(true);
  const [rebuildEmbeddings, setRebuildEmbeddings] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await startAnalysis();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCleanup() {
    setCleaning(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCleaning(false);
  }

  return (
    <Page title="Refresh & Sync">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Refresh All Buttons
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Re-analyze all collections and update recommendation buttons across your store.
              </Text>
              <Button onClick={handleRefresh} loading={refreshing}>
                Run Refresh Now
              </Button>
              <Text as="p" variant="bodySm" tone="subdued">
                Last run: Never
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Cleanup & Maintenance
              </Text>
              <FormLayout>
                <Checkbox
                  label="Remove buttons linking to deleted or hidden collections"
                  checked={cleanupDeletedTargets}
                  onChange={setCleanupDeletedTargets}
                />
                <Checkbox
                  label="Rebuild AI embeddings from scratch"
                  checked={rebuildEmbeddings}
                  onChange={setRebuildEmbeddings}
                  helpText="This will take longer but ensures maximum accuracy"
                />
              </FormLayout>
              <Button onClick={handleCleanup} loading={cleaning}>
                Run Cleanup
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Sync History
              </Text>
              <Banner tone="info">
                No sync history available yet. Run your first sync to see activity here.
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
