import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR: Customer Redaction
 * Shopify sends this 48 hours after a customer requests deletion
 */
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "CUSTOMERS_REDACT") {
    return json({ error: "Invalid topic" }, { status: 400 });
  }

  console.log("Customer redaction request received:", {
    shop,
    customerId: payload.customer?.id,
    ordersToRedact: payload.orders_to_redact,
  });

  // PathConvert doesn't store customer PII
  // No action needed, but log for compliance

  return json({ success: true });
}
