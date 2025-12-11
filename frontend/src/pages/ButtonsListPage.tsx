import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Text,
  Link,
  SkeletonPage,
  SkeletonBodyText,
  useIndexResourceState,
} from '@shopify/polaris';
import { fetchCollectionsWithButtons, refreshAllButtons, deactivateButtons, reactivateButtons } from '../utils/api';
import type { CollectionWithButtons } from '../types';

interface ButtonsListPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export default function ButtonsListPage({ onNavigate }: ButtonsListPageProps) {
  const [collections, setCollections] = useState<CollectionWithButtons[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(collections);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const collectionsData = await fetchCollectionsWithButtons();
      setCollections(collectionsData);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAllButtons();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleBulkDeactivate() {
    try {
      await deactivateButtons(selectedResources);
      await loadData();
    } catch (error) {
      console.error('Failed to deactivate buttons:', error);
    }
  }

  async function handleBulkReactivate() {
    try {
      await reactivateButtons(selectedResources);
      await loadData();
    } catch (error) {
      console.error('Failed to reactivate buttons:', error);
    }
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

  const rowMarkup = collections.map((collection, index) => {
    return (
      <IndexTable.Row
        id={collection.id}
        key={collection.id}
        selected={selectedResources.includes(collection.id)}
        position={index}
      >
        <IndexTable.Cell>
          <Link
            removeUnderline
            onClick={() => onNavigate?.('collection-detail', collection.handle)}
          >
            <Text as="span" fontWeight="semibold">
              {collection.title}
            </Text>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {collection.buttonCount}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" tone="subdued">
            {new Date(collection.updatedAt).toLocaleDateString()}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={collection.status === 'active' ? 'success' : 'info'}>
            {collection.status === 'active' ? 'Active' : 'No buttons'}
          </Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Buttons"
      primaryAction={{
        content: 'Refresh All Buttons',
        onAction: handleRefresh,
        loading: refreshing,
      }}
      actionGroups={[
        {
          title: 'Actions',
          actions: [
            {
              content: 'Deactivate Buttons',
              onAction: handleBulkDeactivate,
              disabled: selectedResources.length === 0,
            },
            {
              content: 'Reactivate Buttons',
              onAction: handleBulkReactivate,
              disabled: selectedResources.length === 0,
            },
          ],
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={{ singular: 'collection', plural: 'collections' }}
              itemCount={collections.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: 'Collection' },
                { title: 'Buttons' },
                { title: 'Last Updated' },
                { title: 'Status' },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
