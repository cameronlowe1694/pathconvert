import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  Checkbox,
  Select,
  TextField,
  Button,
  RadioButton,
  BlockStack,
  Text,
  Banner,
  RangeSlider,
} from '@shopify/polaris';

export default function AISettingsPage() {
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [autoRemove, setAutoRemove] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('weekly');
  const [buttonAlignment, setButtonAlignment] = useState('left');
  const [colorMode, setColorMode] = useState('theme');
  const [customColor, setCustomColor] = useState('#008060');
  const [maxButtons, setMaxButtons] = useState(15);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // Save settings via API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  }

  return (
    <Page
      title="AI & Styling Settings"
      primaryAction={{
        content: 'Save Settings',
        onAction: handleSave,
        loading: saving,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                AI Behavior
              </Text>
              <FormLayout>
                <Checkbox
                  label="Auto-generate buttons for new collections"
                  checked={autoGenerate}
                  onChange={setAutoGenerate}
                  helpText="Automatically create recommendation buttons when you add new collections"
                />
                <Checkbox
                  label="Auto-remove buttons pointing to deleted collections"
                  checked={autoRemove}
                  onChange={setAutoRemove}
                  helpText="Clean up broken links automatically"
                />
                <Select
                  label="Sync frequency"
                  options={[
                    { label: 'Hourly', value: 'hourly' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Manual only', value: 'manual' },
                  ]}
                  value={syncFrequency}
                  onChange={setSyncFrequency}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Button Appearance
              </Text>
              <FormLayout>
                <Select
                  label="Button alignment"
                  options={[
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                  ]}
                  value={buttonAlignment}
                  onChange={setButtonAlignment}
                />
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Button color
                  </Text>
                  <RadioButton
                    label="Match theme primary color"
                    checked={colorMode === 'theme'}
                    id="theme"
                    name="colorMode"
                    onChange={() => setColorMode('theme')}
                  />
                  <RadioButton
                    label="Custom color"
                    checked={colorMode === 'custom'}
                    id="custom"
                    name="colorMode"
                    onChange={() => setColorMode('custom')}
                  />
                  {colorMode === 'custom' && (
                    <TextField
                      label=""
                      value={customColor}
                      onChange={setCustomColor}
                      placeholder="#008060"
                      autoComplete="off"
                    />
                  )}
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Max Buttons per Collection Page
                  </Text>
                  <RangeSlider
                    label=""
                    value={maxButtons}
                    onChange={setMaxButtons}
                    min={1}
                    max={20}
                    output
                  />
                </BlockStack>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
