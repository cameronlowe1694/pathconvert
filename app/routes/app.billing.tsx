import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  List,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getEntitlement } from "~/services/entitlement.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, billing } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: { billing: true },
  });

  if (!shop) {
    return json({ entitlement: null, currentBilling: null });
  }

  const entitlement = await getEntitlement(shop.id);

  return json({
    entitlement,
    currentBilling: shop.billing,
    shopDomain: session.shop,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, billing } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return json({ error: "Shop not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const plan = formData.get("plan") as string; // "monthly" or "annual"

  const amount = plan === "annual" ? 290 : 29;
  const interval = plan === "annual" ? "ANNUAL" : "EVERY_30_DAYS";

  // Create subscription via Shopify Billing API
  try {
    const billingCheck = await billing.require({
      plans: [
        {
          plan: `PathConvert Starter (${plan})`,
          amount,
          currencyCode: "GBP",
          interval,
          trialDays: 0, // No free trial per spec
        },
      ],
      isTest: true, // Set to false in production
      onFailure: async () => {
        throw new Error("Billing approval required");
      },
    });

    // Store billing record
    await prisma.billing.upsert({
      where: { shopId: shop.id },
      update: {
        plan: "starter",
        interval: plan,
        status: "active",
        shopifySubscriptionId: billingCheck.confirmationUrl || null,
      },
      create: {
        shopId: shop.id,
        plan: "starter",
        interval: plan,
        status: "active",
        shopifySubscriptionId: billingCheck.confirmationUrl || null,
      },
    });

    return json({ success: true, confirmationUrl: billingCheck.confirmationUrl });
  } catch (error: any) {
    console.error("Billing error:", error);
    return json({ error: error.message || "Billing failed" }, { status: 500 });
  }
}

export default function Billing() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleSubscribe = (plan: "monthly" | "annual") => {
    fetcher.submit({ plan }, { method: "post" });
  };

  const isActive = data.entitlement?.status === "active";

  return (
    <Page
      title="Billing"
      backAction={{ content: "Dashboard", url: "/app/dashboard" }}
    >
      <Layout>
        {isActive && (
          <Layout.Section>
            <Banner title="Active subscription" tone="success">
              <p>
                You have an active {data.entitlement.interval} subscription.
                {data.entitlement.periodEnd && (
                  <> Next billing: {new Date(data.entitlement.periodEnd).toLocaleDateString()}</>
                )}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {!isActive && (
          <Layout.Section>
            <Banner title="No active subscription" tone="warning">
              <p>Subscribe to unlock collection analysis and button deployment.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack gap="400" align="start">
            {/* Monthly Plan */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Starter Monthly
                </Text>
                <Text as="p" variant="heading2xl">
                  £29
                  <Text as="span" variant="bodyMd" tone="subdued">
                    /month
                  </Text>
                </Text>
                <List>
                  <List.Item>Unlimited collections</List.Item>
                  <List.Item>AI-powered recommendations</List.Item>
                  <List.Item>Automatic gender filtering</List.Item>
                  <List.Item>Customizable button styling</List.Item>
                  <List.Item>No hidden fees</List.Item>
                </List>
                <Button
                  variant="primary"
                  onClick={() => handleSubscribe("monthly")}
                  loading={fetcher.state !== "idle"}
                  disabled={isActive && data.entitlement?.interval === "monthly"}
                >
                  {isActive && data.entitlement?.interval === "monthly"
                    ? "Current Plan"
                    : "Subscribe Monthly"}
                </Button>
              </BlockStack>
            </Card>

            {/* Annual Plan */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Starter Annual
                  <Badge tone="info">Save 2 months</Badge>
                </Text>
                <Text as="p" variant="heading2xl">
                  £290
                  <Text as="span" variant="bodyMd" tone="subdued">
                    /year
                  </Text>
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Equivalent to £24.17/month
                </Text>
                <List>
                  <List.Item>Everything in Monthly</List.Item>
                  <List.Item>Save £58/year (2 months free)</List.Item>
                  <List.Item>Annual billing convenience</List.Item>
                </List>
                <Button
                  variant="primary"
                  onClick={() => handleSubscribe("annual")}
                  loading={fetcher.state !== "idle"}
                  disabled={isActive && data.entitlement?.interval === "annual"}
                >
                  {isActive && data.entitlement?.interval === "annual"
                    ? "Current Plan"
                    : "Subscribe Annually"}
                </Button>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">
                Billing Information
              </Text>
              <Text as="p" variant="bodyMd">
                All subscriptions are billed through Shopify. Cancel anytime from your Shopify admin.
              </Text>
              <Text as="p" variant="bodyMd">
                No free trial is offered. Subscription activates immediately upon approval.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
