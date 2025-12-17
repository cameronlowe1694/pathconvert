import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { createJob } from "~/services/jobQueue.server";
import { getEntitlement } from "~/services/entitlement.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Get or create shop
  let shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        shopDomain: session.shop,
        accessToken: session.accessToken!,
      },
    });

    // Create default settings
    await prisma.settings.create({
      data: {
        shopId: shop.id,
        maxButtons: 15,
        alignment: "left",
      },
    });
  }

  // Check entitlement
  const entitlement = await getEntitlement(shop.id);
  if (!entitlement.canRunJobs) {
    return json(
      {
        success: false,
        error: "Active subscription required",
        requiresBilling: true,
      },
      { status: 403 }
    );
  }

  // Create ANALYSE_DEPLOY job
  const job = await createJob(shop.id, "ANALYSE_DEPLOY");

  return json({
    success: true,
    jobId: job.id,
    message: "Analysis started",
  });
}
