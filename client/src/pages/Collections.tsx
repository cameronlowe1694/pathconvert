import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Badge,
  Text,
  Banner,
  Tooltip,
  Icon,
  InlineStack,
} from '@shopify/polaris';
import { QuestionMarkMinor } from '@shopify/polaris-icons';

interface CollectionsProps {
  shop: string;
}

interface Collection {
  id: string;
  shopifyCollectionId: string;
  handle: string;
  title: string;
  genderCategory: string;
  isEnabled: boolean;
  isExcludedSale: boolean;
  embedding: { id: string } | null;
  _count: {
    sourceEdges: number;
  };
}

export default function Collections({ shop }: CollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string) {
    setToggling(id);

    try {
      const res = await fetch(`/api/collections/${id}/toggle`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchCollections(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to toggle collection:', error);
    } finally {
      setToggling(null);
    }
  }

  // Custom heading components with tooltips
  const headings = [
    'Title',
    'Handle',
    'Category',
    <InlineStack gap="100" blockAlign="center" wrap={false}>
      <span>Has Embedding</span>
      <Tooltip content="AI analysis status. Collections are analyzed using AI to understand their content and generate smart recommendations.">
        <Icon source={QuestionMarkMinor} tone="base" />
      </Tooltip>
    </InlineStack>,
    <InlineStack gap="100" blockAlign="center" wrap={false}>
      <span>Recommendations</span>
      <Tooltip content="Number of recommendation buttons that will appear on this collection's page.">
        <Icon source={QuestionMarkMinor} tone="base" />
      </Tooltip>
    </InlineStack>,
    'Status',
    <InlineStack gap="100" blockAlign="center" wrap={false}>
      <span>Actions</span>
      <Tooltip content="Enable to show recommendations on this collection page, or disable to hide them.">
        <Icon source={QuestionMarkMinor} tone="base" />
      </Tooltip>
    </InlineStack>,
  ];

  const rows = collections.map((col) => [
    col.title,
    col.handle,
    col.genderCategory,
    col.isExcludedSale ? (
      <Badge tone="attention">Sale</Badge>
    ) : col.embedding ? (
      <Badge tone="success">Yes</Badge>
    ) : (
      <Badge tone="info">No</Badge>
    ),
    col._count.sourceEdges,
    col.isEnabled ? (
      <Badge tone="success">Enabled</Badge>
    ) : (
      <Badge>Disabled</Badge>
    ),
    <Button
      size="slim"
      onClick={() => handleToggle(col.id)}
      loading={toggling === col.id}
    >
      {col.isEnabled ? 'Disable' : 'Enable'}
    </Button>,
  ]);

  return (
    <Page
      title="Manage Collections"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
    >
      <Layout>
        <Layout.Section>
          <Banner>
            <Text as="p">
              Enable or disable collections to control which ones can show recommendations.
              Sale collections are automatically excluded.
            </Text>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {loading ? (
              <div style={{ padding: '16px' }}>
                <Text as="p">Loading collections...</Text>
              </div>
            ) : (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'numeric',
                  'text',
                  'text',
                ]}
                headings={headings}
                rows={rows}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
