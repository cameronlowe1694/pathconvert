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
import { useNavigate } from 'react-router-dom';
import { getCollections, getRecommendations, startAnalysis } from '../utils/api';
import type { Collection, Recommendation } from '../types';

export default function ButtonsListPage() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(collections);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [collectionsData, recommendationsData] = await Promise.all([
        getCollections(),
        getRecommendations(),
      ]);
      setCollections(collectionsData);
      setRecommendations(recommendationsData);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await startAnalysis();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  function getButtonCount(collectionId: string): number {
    return recommendations.filter((r) => r.source_collection_id === collectionId).length;
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
    const buttonCount = getButtonCount(collection.handle);

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
            onClick={() => navigate(`/buttons/${collection.handle}`)}
          >
            <Text as="span" fontWeight="semibold">
              {collection.title}
            </Text>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {buttonCount}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" tone="subdued">
            {new Date(collection.updated_at).toLocaleDateString()}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={buttonCount > 0 ? 'success' : 'info'}>
            {buttonCount > 0 ? 'Active' : 'No buttons'}
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
