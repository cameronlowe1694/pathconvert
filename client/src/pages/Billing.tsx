import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  List,
} from '@shopify/polaris';

interface BillingProps {
  shop: string;
}

interface BillingData {
  plan: string;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  shopifySubscriptionId: string | null;
}

export default function Billing({ shop }: BillingProps) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchBilling();
  }, []);

  async function fetchBilling() {
    try {
      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setBilling(data.billing);
      }
    } catch (error) {
      console.error('Failed to fetch billing:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(interval: 'monthly' | 'annual') {
    setSubscribing(true);

    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interval }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Shopify billing confirmation URL
        if (data.confirmationUrl) {
          window.top!.location.href = data.confirmationUrl;
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to start subscription');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('Failed to start subscription');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? Your access will continue until the end of the current billing period.')) {
      return;
    }

    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
      });

      if (res.ok) {
        fetchBilling();
        alert('Subscription cancelled successfully');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel subscription');
    }
  }

  if (loading) {
    return (
      <Page title="Plans & Billing">
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">Loading...</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const hasActiveSubscription = billing?.status === 'active';

  return (
    <Page
      title="Plans & Billing"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
    >
      <Layout>
        {hasActiveSubscription && (
          <Layout.Section>
            <Banner tone="success">
              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">
                  Your subscription is active
                </Text>
                <Text as="p">
                  Plan: {billing.interval === 'annual' ? 'Annual' : 'Monthly'} •
                  {billing.currentPeriodEnd && ` Renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`}
                </Text>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {!hasActiveSubscription && (
          <Layout.Section>
            <Banner tone="warning">
              <Text as="p">
                Subscribe to unlock PathConvert's AI-powered collection recommendations and start driving more sales.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Monthly Plan */}
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  Monthly Plan
                </Text>
                {hasActiveSubscription && billing.interval === 'monthly' && (
                  <Badge tone="success">Current Plan</Badge>
                )}
              </InlineStack>

              <BlockStack gap="200">
                <Text as="p" variant="heading2xl">
                  £29
                  <Text as="span" variant="bodyLg" tone="subdued"> /month</Text>
                </Text>
                <Text as="p" tone="subdued">
                  Billed monthly
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">Includes:</Text>
                <List>
                  <List.Item>Unlimited AI analysis runs</List.Item>
                  <List.Item>Smart collection recommendations</List.Item>
                  <List.Item>Customizable button styles</List.Item>
                  <List.Item>Real-time updates</List.Item>
                  <List.Item>Full analytics dashboard</List.Item>
                  <List.Item>Email support</List.Item>
                </List>
              </BlockStack>

              {!hasActiveSubscription ? (
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={() => handleSubscribe('monthly')}
                  loading={subscribing}
                >
                  Subscribe Monthly
                </Button>
              ) : billing.interval === 'monthly' ? (
                <Button
                  variant="plain"
                  tone="critical"
                  fullWidth
                  onClick={handleCancelSubscription}
                >
                  Cancel Subscription
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => handleSubscribe('monthly')}
                  loading={subscribing}
                >
                  Switch to Monthly
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Annual Plan */}
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  Annual Plan
                </Text>
                {hasActiveSubscription && billing.interval === 'annual' ? (
                  <Badge tone="success">Current Plan</Badge>
                ) : (
                  <Badge tone="attention">Save £58/year</Badge>
                )}
              </InlineStack>

              <BlockStack gap="200">
                <Text as="p" variant="heading2xl">
                  £290
                  <Text as="span" variant="bodyLg" tone="subdued"> /year</Text>
                </Text>
                <Text as="p" tone="subdued">
                  £24.17/month billed annually
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="p" fontWeight="semibold">Everything in Monthly, plus:</Text>
                <List>
                  <List.Item>Save £58 compared to monthly</List.Item>
                  <List.Item>Priority email support</List.Item>
                  <List.Item>Early access to new features</List.Item>
                  <List.Item>Dedicated account manager</List.Item>
                </List>
              </BlockStack>

              {!hasActiveSubscription ? (
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={() => handleSubscribe('annual')}
                  loading={subscribing}
                >
                  Subscribe Annually
                </Button>
              ) : billing.interval === 'annual' ? (
                <Button
                  variant="plain"
                  tone="critical"
                  fullWidth
                  onClick={handleCancelSubscription}
                >
                  Cancel Subscription
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => handleSubscribe('annual')}
                  loading={subscribing}
                >
                  Switch to Annual
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Frequently Asked Questions
              </Text>
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text as="p" fontWeight="semibold">Can I cancel anytime?</Text>
                  <Text as="p">
                    Yes, you can cancel your subscription at any time. You'll retain access until the end of your current billing period.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" fontWeight="semibold">What happens if I cancel?</Text>
                  <Text as="p">
                    Your recommendations will stop updating and the Analyse & Deploy feature will be disabled. Existing recommendations will remain visible until you uninstall the app.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" fontWeight="semibold">Can I switch plans?</Text>
                  <Text as="p">
                    Yes, you can upgrade or downgrade between monthly and annual plans at any time. Changes take effect at your next billing cycle.
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
