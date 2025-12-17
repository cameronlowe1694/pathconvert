import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Banner,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: { settings: true },
  });

  if (!shop) {
    return json({ maxButtons: 15, alignment: "left" });
  }

  return json({
    maxButtons: shop.settings?.maxButtons || 15,
    alignment: shop.settings?.alignment || "left",
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
  const maxButtons = parseInt(formData.get("maxButtons") as string);
  const alignment = formData.get("alignment") as string;

  // Validation
  if (isNaN(maxButtons) || maxButtons < 1 || maxButtons > 20) {
    return json({ error: "Max buttons must be between 1 and 20" }, { status: 400 });
  }

  if (!["left", "center", "right"].includes(alignment)) {
    return json({ error: "Invalid alignment" }, { status: 400 });
  }

  // Update settings
  await prisma.settings.upsert({
    where: { shopId: shop.id },
    update: { maxButtons, alignment },
    create: { shopId: shop.id, maxButtons, alignment },
  });

  // Increment cache version
  await prisma.shop.update({
    where: { id: shop.id },
    data: { cacheVersion: { increment: 1 } },
  });

  return redirect("/app/settings?success=true");
}

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [maxButtons, setMaxButtons] = useState(data.maxButtons.toString());
  const [alignment, setAlignment] = useState(data.alignment);

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const showSuccess = searchParams.get("success") === "true";

  return (
    <Page
      title="Settings"
      backAction={{ content: "Dashboard", url: "/app/dashboard" }}
    >
      <Layout>
        {showSuccess && (
          <Layout.Section>
            <Banner title="Settings saved" tone="success">
              <p>Your settings have been updated. Cache has been invalidated.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Form method="post">
              <FormLayout>
                <BlockStack gap="400">
                  <TextField
                    label="Maximum buttons per page"
                    type="number"
                    value={maxButtons}
                    onChange={setMaxButtons}
                    name="maxButtons"
                    min={1}
                    max={20}
                    helpText="Show 1-20 recommendation buttons (default: 15)"
                    autoComplete="off"
                  />

                  <Select
                    label="Button alignment"
                    options={[
                      { label: "Left", value: "left" },
                      { label: "Center", value: "center" },
                      { label: "Right", value: "right" },
                    ]}
                    value={alignment}
                    onChange={setAlignment}
                    name="alignment"
                  />

                  <Button submit variant="primary" loading={isSubmitting}>
                    Save Settings
                  </Button>
                </BlockStack>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
