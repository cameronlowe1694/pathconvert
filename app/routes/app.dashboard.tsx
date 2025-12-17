import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  Text,
  ProgressBar,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getEntitlement } from "~/services/entitlement.server";
import { getLatestJobForShop } from "~/services/jobQueue.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  let shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: {
      _count: {
        select: {
          collections: true,
        },
      },
    },
  });

  if (!shop) {
    // Create shop on first access
    shop = await prisma.shop.create({
      data: {
        shopDomain: session.shop,
        accessToken: session.accessToken!,
      },
      include: {
        _count: {
          select: {
            collections: true,
          },
        },
      },
    });

    // Create default settings
    await prisma.settings.create({
      data: {
        shopId: shop.id,
      },
    });
  }

  const entitlement = await getEntitlement(shop.id);
  const latestJob = await getLatestJobForShop(shop.id);

  const enabledCollections = await prisma.collection.count({
    where: {
      shopId: shop.id,
      isEnabled: true,
    },
  });

  const totalEdges = await prisma.edge.count({
    where: {
      sourceCollection: {
        shopId: shop.id,
      },
    },
  });

  return json({
    shopDomain: shop.shopDomain,
    totalCollections: shop._count.collections,
    enabledCollections,
    totalEdges,
    lastAnalysedAt: shop.lastAnalysedAt,
    entitlement,
    latestJob: latestJob
      ? {
          id: latestJob.id,
          type: latestJob.type,
          status: latestJob.status,
          progressPercent: latestJob.progressPercent,
          step: latestJob.step,
          errorMessage: latestJob.errorMessage,
        }
      : null,
  });
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const analyseDeployFetcher = useFetcher();
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(data.latestJob);

  // Start polling if job is running
  useEffect(() => {
    if (data.latestJob?.status === "running") {
      setPollingJobId(data.latestJob.id);
    }
  }, [data.latestJob]);

  // Poll job status
  useEffect(() => {
    if (!pollingJobId) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/job-status/${pollingJobId}`);
      const status = await response.json();
      setJobStatus(status);

      if (status.status === "complete" || status.status === "failed") {
        setPollingJobId(null);
        // Reload page to update stats
        window.location.reload();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingJobId]);

  // Handle analyse deploy response
  useEffect(() => {
    if (analyseDeployFetcher.data?.jobId) {
      setPollingJobId(analyseDeployFetcher.data.jobId);
    }
  }, [analyseDeployFetcher.data]);

  const handleAnalyseDeploy = () => {
    analyseDeployFetcher.submit({}, { method: "post", action: "/api/analyse-deploy" });
  };

  const isRunning = jobStatus?.status === "running" || analyseDeployFetcher.state !== "idle";
  const requiresBilling = analyseDeployFetcher.data?.requiresBilling;

  return (
    <Page title="PathConvert Dashboard">
      <Layout>
        {requiresBilling && (
          <Layout.Section>
            <Banner
              title="Active subscription required"
              tone="warning"
              action={{ content: "Subscribe", url: "/app/billing" }}
            >
              <p>You need an active subscription to analyse and deploy recommendations.</p>
            </Banner>
          </Layout.Section>
        )}

        {jobStatus?.status === "failed" && (
          <Layout.Section>
            <Banner title="Analysis failed" tone="critical">
              <p>{jobStatus.errorMessage || "Unknown error occurred"}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Start
              </Text>
              <Text as="p" variant="bodyMd">
                Click "Analyse & Deploy" to scan your collections, generate AI-powered
                recommendations, and deploy to your storefront.
              </Text>
              <InlineStack gap="400">
                <Button
                  variant="primary"
                  onClick={handleAnalyseDeploy}
                  loading={isRunning}
                  disabled={!data.entitlement.canRunJobs}
                >
                  {isRunning ? "Analysing..." : "Analyse & Deploy"}
                </Button>
                <Button url="/app/settings">Settings</Button>
                <Button url="/app/manage">Manage Collections</Button>
              </InlineStack>

              {isRunning && jobStatus && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {jobStatus.step || "Processing..."}
                  </Text>
                  <ProgressBar progress={jobStatus.progressPercent || 0} size="small" />
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Total Collections
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {data.totalCollections}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Collections Enabled
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {data.enabledCollections}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Button Links Live
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {data.totalEdges}
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">
                Last Analysed
              </Text>
              <Text as="p" variant="bodyMd">
                {data.lastAnalysedAt
                  ? new Date(data.lastAnalysedAt).toLocaleString()
                  : "Never"}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">
                Subscription Status
              </Text>
              <Text as="p" variant="bodyMd">
                {data.entitlement.status === "active" ? (
                  <>
                    <Text as="span" fontWeight="bold" tone="success">
                      Active
                    </Text>
                    {" - "}
                    {data.entitlement.interval === "monthly" ? "Monthly" : "Annual"} plan
                  </>
                ) : (
                  <Text as="span" tone="critical">
                    No active subscription
                  </Text>
                )}
              </Text>
              <Button url="/app/billing">Manage Billing</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
