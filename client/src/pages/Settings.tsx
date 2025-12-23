import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Text,
  BlockStack,
  Banner,
} from '@shopify/polaris';

interface SettingsProps {
  shop: string;
}

interface SettingsData {
  id: string;
  maxButtons: number;
  buttonStyle: string;
  alignment: string;
}

export default function Settings({ shop }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [maxButtons, setMaxButtons] = useState('15');
  const [buttonStyle, setButtonStyle] = useState('pill');
  const [alignment, setAlignment] = useState('left');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setMaxButtons(String(data.settings.maxButtons));
        setButtonStyle(data.settings.buttonStyle);
        setAlignment(data.settings.alignment);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxButtons: parseInt(maxButtons, 10),
          buttonStyle,
          alignment,
        }),
      });

      if (res.ok) {
        setSaved(true);
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page title="Settings">
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

  return (
    <Page
      title="Settings"
      backAction={{ content: 'Dashboard', url: '/dashboard' }}
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        loading: saving,
      }}
    >
      <Layout>
        {saved && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSaved(false)}>
              Settings saved successfully
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Recommendation Display
              </Text>
              <FormLayout>
                <TextField
                  label="Maximum recommendations"
                  type="number"
                  value={maxButtons}
                  onChange={setMaxButtons}
                  min={1}
                  max={30}
                  helpText="How many recommendation buttons to show per collection (1-30)"
                  autoComplete="off"
                />
                <Select
                  label="Button style"
                  options={[
                    { label: 'Pill (rounded ends)', value: 'pill' },
                    { label: 'Rounded corners', value: 'rounded' },
                    { label: 'Square corners', value: 'square' },
                  ]}
                  value={buttonStyle}
                  onChange={setButtonStyle}
                  helpText="Visual style of recommendation buttons"
                />
                <Select
                  label="Button container alignment"
                  options={[
                    { label: 'Left (inline with H1 padding)', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                  ]}
                  value={alignment}
                  onChange={setAlignment}
                  helpText="Horizontal alignment of the button container to match your site layout"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                About PathConvert
              </Text>
              <Text as="p">
                PathConvert uses AI to analyze your collections (titles, descriptions, and products) to automatically generate smart, context-aware recommendations that help customers discover related products.
              </Text>
              <Text as="p">
                Features include auto-injection (no theme editing required), AI-powered gender filtering to prevent cross-category recommendations, smart exclusions of generic pages and sale collections, and automatic broken link detection for SEO health.
              </Text>
              <Text as="p" tone="subdued">
                Version 1.0.0
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
