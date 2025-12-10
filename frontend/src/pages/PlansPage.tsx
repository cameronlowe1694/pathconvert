import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  List,
  Badge,
} from '@shopify/polaris';

type Plan = {
  name: string;
  price: string;
  features: string[];
  current: boolean;
  recommended?: boolean;
};

const plans: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    features: [
      'Up to 5 collections',
      'Basic AI recommendations',
      'Manual refresh only',
      'Community support',
    ],
    current: true,
  },
  {
    name: 'Pro',
    price: '$29',
    features: [
      'Unlimited collections',
      'Advanced AI with gender detection',
      'Automatic weekly sync',
      'Priority email support',
      'Custom button styling',
      'Analytics & insights',
    ],
    current: false,
    recommended: true,
  },
  {
    name: 'Advanced',
    price: '$79',
    features: [
      'Everything in Pro',
      'Daily automatic sync',
      'A/B testing for buttons',
      'Advanced analytics & reports',
      'Dedicated account manager',
      'Custom AI training',
      'White-label options',
    ],
    current: false,
  },
];

export default function PlansPage() {
  function handleUpgrade(planName: string) {
    // Redirect to Shopify billing
    console.log(`Upgrade to ${planName}`);
  }

  return (
    <Page title="Plans & Billing">
      <Layout>
        {plans.map((plan) => (
          <Layout.Section key={plan.name} oneThird>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingLg">
                    {plan.name}
                  </Text>
                  {plan.recommended && <Badge tone="success">Recommended</Badge>}
                </InlineStack>

                <BlockStack gap="100">
                  <Text as="p" variant="heading2xl" fontWeight="bold">
                    {plan.price}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    per month
                  </Text>
                </BlockStack>

                <List type="bullet">
                  {plan.features.map((feature) => (
                    <List.Item key={feature}>{feature}</List.Item>
                  ))}
                </List>

                <Button
                  variant={plan.current ? 'secondary' : 'primary'}
                  disabled={plan.current}
                  onClick={() => handleUpgrade(plan.name)}
                  fullWidth
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Need a custom plan?
              </Text>
              <Text as="p" variant="bodyMd">
                For enterprise customers with unique requirements, we offer custom plans tailored to your needs.
              </Text>
              <Button>Contact Sales</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
