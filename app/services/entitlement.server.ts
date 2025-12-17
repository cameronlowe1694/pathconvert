import prisma from "~/db.server";

export interface Entitlement {
  canRunJobs: boolean;
  canRenderButtons: boolean;
  status: string;
  interval: string | null;
  periodEnd: Date | null;
}

/**
 * Central entitlement helper - single source of truth for billing gates
 */
export async function getEntitlement(shopId: string): Promise<Entitlement> {
  try {
    const billing = await prisma.billing.findUnique({
      where: { shopId },
    });

    // No billing record = no entitlement
    if (!billing) {
      return {
        canRunJobs: false,
        canRenderButtons: false,
        status: "none",
        interval: null,
        periodEnd: null,
      };
    }

    // Active subscription = full access
    if (billing.status === "active") {
      return {
        canRunJobs: true,
        canRenderButtons: true,
        status: billing.status,
        interval: billing.interval,
        periodEnd: billing.currentPeriodEnd,
      };
    }

    // Cancelled or frozen = no access
    return {
      canRunJobs: false,
      canRenderButtons: false,
      status: billing.status,
      interval: billing.interval,
      periodEnd: billing.currentPeriodEnd,
    };
  } catch (error) {
    console.error("Error checking entitlement:", error);
    // Fail-safe: deny access if check fails
    return {
      canRunJobs: false,
      canRenderButtons: false,
      status: "error",
      interval: null,
      periodEnd: null,
    };
  }
}
