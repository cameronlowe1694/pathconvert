import { json, type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import { getRecommendations } from "~/services/similarity.server";
import { getEntitlement } from "~/services/entitlement.server";
import crypto from "crypto";

/**
 * Verify Shopify App Proxy HMAC signature
 */
function verifyProxySignature(url: URL): boolean {
  const params = new URLSearchParams(url.search);
  const signature = params.get("signature");
  params.delete("signature");

  if (!signature) return false;

  // Sort parameters
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("");

  const secret = process.env.SHOPIFY_API_SECRET || "";
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex");

  return signature === computedSignature;
}

/**
 * App Proxy endpoint: /apps/pathconvert/buttons
 * Query params: shop, collectionHandle
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Verify signature (App Proxy adds this automatically)
  if (!verifyProxySignature(url)) {
    return json({ error: "Invalid signature" }, { status: 403 });
  }

  const shopDomain = url.searchParams.get("shop");
  const collectionHandle = url.searchParams.get("collectionHandle");

  if (!shopDomain || !collectionHandle) {
    return json({ alignment: "left", buttons: [] });
  }

  // Get shop
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { settings: true },
  });

  if (!shop) {
    return json({ alignment: "left", buttons: [] });
  }

  // Check entitlement
  const entitlement = await getEntitlement(shop.id);
  if (!entitlement.canRenderButtons) {
    return json({ alignment: "left", buttons: [] });
  }

  // Get recommendations
  const recommendations = await getRecommendations(shop.id, collectionHandle);

  // Apply maxButtons limit
  const maxButtons = shop.settings?.maxButtons || 15;
  const limitedRecommendations = recommendations.slice(0, maxButtons);

  return json({
    alignment: shop.settings?.alignment || "left",
    buttons: limitedRecommendations.map((rec) => ({
      title: rec.title,
      url: rec.url,
    })),
  });
}
