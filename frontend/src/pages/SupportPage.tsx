import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  List,
} from '@shopify/polaris';

export default function SupportPage() {
  function handleChatSupport() {
    // Placeholder - will be connected to actual support chat later
    console.log('Opening support chat...');
  }

  function handleEmailSupport() {
    window.location.href = 'mailto:support@pathconvert.com';
  }

  return (
    <Page title="Support">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Need Help?
              </Text>
              <Text as="p" variant="bodyMd">
                Our support team is here to help you get the most out of PathConvert.
              </Text>
              <BlockStack gap="200">
                <Button onClick={handleChatSupport}>Chat with Support</Button>
                <Button onClick={handleEmailSupport}>Email Us</Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Links
              </Text>
              <List type="bullet">
                <List.Item>
                  <Button
                    url="https://docs.pathconvert.com"
                    external
                    variant="plain"
                  >
                    Documentation
                  </Button>
                </List.Item>
                <List.Item>
                  <Button
                    url="https://docs.pathconvert.com/faq"
                    external
                    variant="plain"
                  >
                    Frequently Asked Questions
                  </Button>
                </List.Item>
                <List.Item>
                  <Button
                    url="https://docs.pathconvert.com/case-studies/plp-performance"
                    external
                    variant="plain"
                  >
                    PLP Performance Case Study
                  </Button>
                </List.Item>
                <List.Item>
                  <Button
                    url="https://docs.pathconvert.com/guides"
                    external
                    variant="plain"
                  >
                    Getting Started Guide
                  </Button>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Common Questions
              </Text>
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    How do the AI recommendations work?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    PathConvert uses OpenAI embeddings and cosine similarity to analyze your
                    collection content and automatically recommend the most relevant related
                    collections to display as buttons on each product listing page.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    How often should I refresh the buttons?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    We recommend refreshing whenever you add new collections or make significant
                    changes to existing ones. You can also enable automatic sync in AI Settings for
                    daily or hourly updates.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Can I customize the button appearance?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Yes! Visit the AI Settings page to customize button shape, color, alignment, and
                    placement on your collection pages.
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
