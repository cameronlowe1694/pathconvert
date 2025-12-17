import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import {
  getNextPendingJob,
  updateJobProgress,
  completeJob,
  failJob,
} from "./jobQueue.server";
import { syncCollections } from "./collections.server";
import { generateAllEmbeddings } from "./embeddings.server";
import { buildSimilarityEdges } from "./similarity.server";
import prisma from "~/db.server";

/**
 * Process a single job
 */
export async function processJob(job: any, admin: AdminApiContext) {
  try {
    switch (job.type) {
      case "ANALYSE_DEPLOY":
        await processAnalyseDeploy(job, admin);
        break;

      case "FETCH_COLLECTIONS":
        await processFetchCollections(job, admin);
        break;

      case "EMBED_COLLECTIONS":
        await processEmbedCollections(job);
        break;

      case "BUILD_EDGES":
        await processBuildEdges(job);
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(job.id);
  } catch (error: any) {
    console.error(`Job ${job.id} failed:`, error);
    await failJob(job.id, error.message || "Unknown error");
  }
}

/**
 * Process ANALYSE_DEPLOY job (orchestrates all sub-jobs)
 */
async function processAnalyseDeploy(job: any, admin: AdminApiContext) {
  // Step 1: Fetch collections
  await updateJobProgress(job.id, 10, "Fetching collections from Shopify");
  const syncResult = await syncCollections(job.shopId, admin);
  console.log("Collections synced:", syncResult);

  // Step 2: Generate embeddings
  await updateJobProgress(job.id, 40, "Generating AI embeddings");
  const embeddingResult = await generateAllEmbeddings(job.shopId);
  console.log("Embeddings generated:", embeddingResult);

  // Step 3: Build similarity edges
  await updateJobProgress(job.id, 75, "Building recommendation graph");
  const edgeResult = await buildSimilarityEdges(job.shopId);
  console.log("Edges built:", edgeResult);

  // Step 4: Increment cache version
  await updateJobProgress(job.id, 95, "Finalizing deployment");
  await prisma.shop.update({
    where: { id: job.shopId },
    data: {
      lastAnalysedAt: new Date(),
      cacheVersion: {
        increment: 1,
      },
    },
  });

  await updateJobProgress(job.id, 100, "Complete");
}

/**
 * Process FETCH_COLLECTIONS job
 */
async function processFetchCollections(job: any, admin: AdminApiContext) {
  await updateJobProgress(job.id, 10, "Fetching collections");
  const result = await syncCollections(job.shopId, admin);
  await updateJobProgress(job.id, 100, `Synced ${result.created + result.updated} collections`);
}

/**
 * Process EMBED_COLLECTIONS job
 */
async function processEmbedCollections(job: any) {
  await updateJobProgress(job.id, 10, "Generating embeddings");
  const result = await generateAllEmbeddings(job.shopId);
  await updateJobProgress(job.id, 100, `Generated ${result.created + result.updated} embeddings`);
}

/**
 * Process BUILD_EDGES job
 */
async function processBuildEdges(job: any) {
  await updateJobProgress(job.id, 10, "Building recommendation graph");
  const result = await buildSimilarityEdges(job.shopId);
  await updateJobProgress(job.id, 100, `Built ${result.edgesCreated} edges`);

  // Increment cache version
  await prisma.shop.update({
    where: { id: job.shopId },
    data: {
      cacheVersion: {
        increment: 1,
      },
    },
  });
}

/**
 * Job worker loop (for production - would run in separate process)
 * This is a simple in-process worker for the MVP
 */
export async function startJobWorker(adminGetter: (shopId: string) => Promise<AdminApiContext>) {
  console.log("Job worker started");

  while (true) {
    try {
      const job = await getNextPendingJob();

      if (job) {
        console.log(`Processing job ${job.id} (${job.type})`);
        const admin = await adminGetter(job.shopId);
        await processJob(job, admin);
      } else {
        // No pending jobs, wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error("Job worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
