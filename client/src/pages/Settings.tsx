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
                PathConvert uses AI to analyze your collection descriptions and automatically
                generate smart recommendations that help customers discover related products.
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
