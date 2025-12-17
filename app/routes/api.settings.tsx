import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: { settings: true },
  });

  if (!shop || !shop.settings) {
    return json({
      maxButtons: 15,
      alignment: "left",
    });
  }

  return json({
    maxButtons: shop.settings.maxButtons,
    alignment: shop.settings.alignment,
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
    return json({ error: "maxButtons must be between 1 and 20" }, { status: 400 });
  }

  if (!["left", "center", "right"].includes(alignment)) {
    return json({ error: "alignment must be left, center, or right" }, { status: 400 });
  }

  // Update settings
  await prisma.settings.upsert({
    where: { shopId: shop.id },
    update: {
      maxButtons,
      alignment,
    },
    create: {
      shopId: shop.id,
      maxButtons,
      alignment,
    },
  });

  // Increment cache version to bust cache
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      cacheVersion: {
        increment: 1,
      },
    },
  });

  return json({ success: true });
}
