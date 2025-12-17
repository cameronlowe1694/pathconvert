import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR: Customer Data Request
 * Shopify sends this when a customer requests their data
 */
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "CUSTOMERS_DATA_REQUEST") {
    return json({ error: "Invalid topic" }, { status: 400 });
  }

  console.log("Customer data request received:", {
    shop,
    customerId: payload.customer?.id,
    ordersRequested: payload.orders_requested,
  });

  // PathConvert doesn't store customer PII
  // We only store shop-level data (collections, embeddings, edges)
  // Log the request for compliance records

  return json({ success: true });
}
