import prisma from "../db.js";

export type JobType =
  | "ANALYSE_DEPLOY"
  | "FETCH_COLLECTIONS"
  | "EMBED_COLLECTIONS"
  | "BUILD_EDGES"
  | "CLEANUP_DELETED";

export type JobStatus = "pending" | "running" | "complete" | "failed";

/**
 * Create a new job in the queue
 */
export async function createJob(shopId: string, type: JobType) {
  return await prisma.job.create({
    data: {
      shopId,
      type,
      status: "pending",
      progressPercent: 0,
    },
  });
}

/**
 * Get next pending job (uses FOR UPDATE SKIP LOCKED pattern)
 */
export async function getNextPendingJob(): Promise<any | null> {
  // SQLite doesn't support FOR UPDATE SKIP LOCKED, so we use a simple query
  // In production with Postgres, this would use row-level locking
  const job = await prisma.job.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (job) {
    // Mark as running immediately
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running" },
    });
  }

  return job;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progressPercent: number,
  step?: string
) {
  return await prisma.job.update({
    where: { id: jobId },
    data: {
      progressPercent,
      step,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark job as complete
 */
export async function completeJob(jobId: string) {
  return await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "complete",
      progressPercent: 100,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, errorMessage: string) {
  return await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  return await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      type: true,
      status: true,
      progressPercent: true,
      step: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get latest job for shop
 */
export async function getLatestJobForShop(shopId: string) {
  return await prisma.job.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });
}
