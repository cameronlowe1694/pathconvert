import {
  getNextPendingJob,
  updateJobProgress,
  completeJob,
  failJob,
} from "./jobQueue.js";
import { syncCollections } from "./collections.js";
import { generateAllEmbeddings } from "./embeddings.js";
import { buildSimilarityEdges } from "./similarity.js";
import { checkAndAlert } from "./alerts.js";
import prisma from "../db.js";

/**
 * Process a single job
 */
export async function processJob(job: any, shop: string, accessToken: string) {
  try {
    switch (job.type) {
      case "ANALYSE_DEPLOY":
        await processAnalyseDeploy(job, shop, accessToken);
        break;

      case "FETCH_COLLECTIONS":
        await processFetchCollections(job, shop, accessToken);
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

    // After successful job completion, check capacity and send alerts if needed
    if (job.type === "ANALYSE_DEPLOY") {
      checkAndAlert().catch((err) =>
        console.error("Capacity alert check failed:", err)
      );
    }
  } catch (error: any) {
    console.error(`Job ${job.id} failed:`, error);
    await failJob(job.id, error.message || "Unknown error");
  }
}

/**
 * Process ANALYSE_DEPLOY job (orchestrates all sub-jobs)
 */
async function processAnalyseDeploy(job: any, shop: string, accessToken: string) {
  // Step 1: Fetch collections
  await updateJobProgress(job.id, 10, "Fetching collections from Shopify");
  const syncResult = await syncCollections(job.shopId, shop, accessToken);
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

  // Store detailed results for UI summary
  const results = {
    collections: {
      created: syncResult.created,
      updated: syncResult.updated,
      skipped: syncResult.skipped,
      disabled: syncResult.disabled,
    },
    embeddings: {
      created: embeddingResult.created,
      updated: embeddingResult.updated,
      errors: embeddingResult.errors,
    },
    edges: {
      created: edgeResult.edgesCreated,
      collectionsProcessed: edgeResult.collectionsProcessed,
    },
  };

  await prisma.job.update({
    where: { id: job.id },
    data: { results: JSON.stringify(results) },
  });

  await updateJobProgress(job.id, 100, "Complete");
}

/**
 * Process FETCH_COLLECTIONS job
 */
async function processFetchCollections(job: any, shop: string, accessToken: string) {
  await updateJobProgress(job.id, 10, "Fetching collections");
  const result = await syncCollections(job.shopId, shop, accessToken);
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
export async function startJobWorker() {
  console.log("Job worker started");

  while (true) {
    try {
      const job = await getNextPendingJob();

      if (job) {
        console.log(`Processing job ${job.id} (${job.type})`);

        // Get shop credentials from database
        const shop = await prisma.shop.findUnique({
          where: { id: job.shopId },
          select: { shopDomain: true, accessToken: true },
        });

        if (!shop) {
          throw new Error(`Shop ${job.shopId} not found`);
        }

        await processJob(job, shop.shopDomain, shop.accessToken);
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
