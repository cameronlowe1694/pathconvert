import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  SkeletonPage,
  SkeletonBodyText,
} from '@shopify/polaris';
import { getRecommendations, getCollections } from '../utils/api';
import type { Recommendation, Collection } from '../types';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [buttons, setButtons] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [collections, recommendations] = await Promise.all([
        getCollections(),
        getRecommendations(),
      ]);

      const currentCollection = collections.find((c) => c.handle === id);
      const collectionButtons = recommendations.filter(
        (r) => r.source_collection_id === id
      );

      setCollection(currentCollection || null);
      setButtons(collectionButtons);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SkeletonPage primaryAction backAction>
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

  if (!collection) {
    return (
      <Page
        title="Collection Not Found"
        backAction={{ onAction: () => navigate('/buttons') }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">This collection could not be found.</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={collection.title}
      backAction={{ onAction: () => navigate('/buttons') }}
      primaryAction={{
        content: 'Regenerate with AI',
        onAction: () => console.log('Regenerate'),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Preview
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                This is how recommendation buttons will appear on your collection page.
              </Text>
              <InlineStack gap="200">
                {buttons.map((button) => (
                  <Button key={button.id} size="slim">
                    {button.target_collection_id}
                  </Button>
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recommendation Buttons ({buttons.length})
              </Text>
              {buttons.length === 0 ? (
                <Text as="p" variant="bodyMd" tone="subdued">
                  No recommendation buttons found for this collection.
                </Text>
              ) : (
                <BlockStack gap="300">
                  {buttons.map((button) => (
                    <InlineStack key={button.id} align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {button.target_collection_id}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Relevance: {(parseFloat(button.similarity_score) * 100).toFixed(0)}%
                        </Text>
                      </BlockStack>
                      <Badge tone="success">Visible</Badge>
                    </InlineStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
