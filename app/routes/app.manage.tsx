import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Banner,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return json({ collections: [] });
  }

  const collections = await prisma.collection.findMany({
    where: { shopId: shop.id },
    include: {
      edgesFrom: {
        select: { id: true },
      },
    },
    orderBy: { title: "asc" },
  });

  return json({
    collections: collections.map((c) => ({
      id: c.id,
      handle: c.handle,
      title: c.title,
      isEnabled: c.isEnabled,
      isExcludedSale: c.isExcludedSale,
      genderCategory: c.genderCategory,
      recommendationCount: c.edgesFrom.length,
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return json({ error: "Shop not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const collectionIds = JSON.parse(formData.get("collectionIds") as string);

  if (!["enable", "disable"].includes(action as string)) {
    return json({ error: "Invalid action" }, { status: 400 });
  }

  const isEnabled = action === "enable";

  await prisma.collection.updateMany({
    where: {
      id: { in: collectionIds },
      shopId: shop.id,
    },
    data: { isEnabled },
  });

  // Increment cache version
  await prisma.shop.update({
    where: { id: shop.id },
    data: { cacheVersion: { increment: 1 } },
  });

  return json({ success: true, updated: collectionIds.length });
}

export default function ManageCollections() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleBulkAction = (action: "enable" | "disable") => {
    const selectedIds = selectedRows.map((index) => data.collections[index].id);

    fetcher.submit(
      {
        action,
        collectionIds: JSON.stringify(selectedIds),
      },
      { method: "post" }
    );

    setSelectedRows([]);
  };

  const rows = data.collections.map((collection) => [
    collection.title,
    collection.handle,
    collection.isEnabled ? (
      <Badge tone="success">Enabled</Badge>
    ) : (
      <Badge>Disabled</Badge>
    ),
    collection.isExcludedSale ? (
      <Badge tone="warning">Sale</Badge>
    ) : (
      <Badge tone="info">{collection.genderCategory}</Badge>
    ),
    collection.recommendationCount.toString(),
  ]);

  return (
    <Page
      title="Manage Collections"
      backAction={{ content: "Dashboard", url: "/app/dashboard" }}
    >
      <Layout>
        {fetcher.data?.success && (
          <Layout.Section>
            <Banner title="Collections updated" tone="success">
              <p>{fetcher.data.updated} collections updated successfully.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "numeric"]}
              headings={["Title", "Handle", "Status", "Category", "Recommendations"]}
              rows={rows}
              selectable
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
            />

            {selectedRows.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <InlineStack gap="300">
                  <Button
                    onClick={() => handleBulkAction("enable")}
                    loading={fetcher.state !== "idle"}
                  >
                    Enable Selected ({selectedRows.length})
                  </Button>
                  <Button
                    onClick={() => handleBulkAction("disable")}
                    loading={fetcher.state !== "idle"}
                  >
                    Disable Selected ({selectedRows.length})
                  </Button>
                </InlineStack>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
