import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return json({ collections: [] });
  }

  const collections = await prisma.collection.findMany({
    where: { shopId: shop.id },
    include: {
      edgesFrom: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  return json({
    collections: collections.map((c) => ({
      id: c.id,
      handle: c.handle,
      title: c.title,
      isEnabled: c.isEnabled,
      isExcludedSale: c.isExcludedSale,
      genderCategory: c.genderCategory,
      recommendationCount: c.edgesFrom.length,
    })),
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
  const action = formData.get("action");
  const collectionIds = JSON.parse(formData.get("collectionIds") as string);

  if (!["enable", "disable"].includes(action as string)) {
    return json({ error: "Invalid action" }, { status: 400 });
  }

  const isEnabled = action === "enable";

  await prisma.collection.updateMany({
    where: {
      id: { in: collectionIds },
      shopId: shop.id,
    },
    data: {
      isEnabled,
    },
  });

  // Increment cache version
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      cacheVersion: {
        increment: 1,
      },
    },
  });

  return json({ success: true, updated: collectionIds.length });
}
