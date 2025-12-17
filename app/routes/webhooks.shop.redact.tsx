import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR: Shop Redaction
 * Shopify sends this 48 hours after app uninstallation
 * We must delete all shop data
 */
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "SHOP_REDACT") {
    return json({ error: "Invalid topic" }, { status: 400 });
  }

  console.log("Shop redaction request received:", {
    shop: payload.shop_domain,
  });

  try {
    // Delete all shop data (cascades to collections, embeddings, edges, etc.)
    const deleted = await prisma.shop.deleteMany({
      where: { shopDomain: payload.shop_domain },
    });

    console.log(`Deleted shop data for ${payload.shop_domain}:`, deleted);

    return json({ success: true });
  } catch (error) {
    console.error("Shop redaction error:", error);
    return json({ error: "Redaction failed" }, { status: 500 });
  }
}
