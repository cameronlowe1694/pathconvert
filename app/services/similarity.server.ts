import prisma from "~/db.server";
import { cosineSimilarity } from "./embeddings.server";

/**
 * Check if collection can recommend to target based on gender
 */
function canRecommend(sourceGender: string, targetGender: string): boolean {
  // men -> men + unisex
  if (sourceGender === "men") {
    return targetGender === "men" || targetGender === "unisex" || targetGender === "unknown";
  }

  // women -> women + unisex
  if (sourceGender === "women") {
    return targetGender === "women" || targetGender === "unisex" || targetGender === "unknown";
  }

  // unisex/unknown -> any
  return true;
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;

  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sortedArray[lower];
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Build similarity edges for all collections in a shop
 */
export async function buildSimilarityEdges(shopId: string) {
  // Get all enabled, non-sale collections with embeddings
  const collections = await prisma.collection.findMany({
    where: {
      shopId,
      isEnabled: true,
      isExcludedSale: false,
      embedding: {
        isNot: null,
      },
    },
    include: {
      embedding: true,
    },
  });

  if (collections.length < 2) {
    return { edgesCreated: 0, collectionsProcessed: 0 };
  }

  // Delete existing edges for this shop
  await prisma.edge.deleteMany({
    where: {
      sourceCollection: {
        shopId,
      },
    },
  });

  let edgesCreated = 0;

  for (const source of collections) {
    const sourceVector = JSON.parse(source.embedding!.embeddingVector);
    const similarities: Array<{
      collectionId: string;
      score: number;
      genderCategory: string;
    }> = [];

    // Calculate similarity to all other collections
    for (const target of collections) {
      if (source.id === target.id) continue;

      // Check gender compatibility
      if (!canRecommend(source.genderCategory, target.genderCategory)) {
        continue;
      }

      const targetVector = JSON.parse(target.embedding!.embeddingVector);
      const score = cosineSimilarity(sourceVector, targetVector);

      similarities.push({
        collectionId: target.id,
        score,
        genderCategory: target.genderCategory,
      });
    }

    if (similarities.length === 0) continue;

    // Sort by score descending
    similarities.sort((a, b) => b.score - a.score);

    // Calculate adaptive threshold
    const scores = similarities.map((s) => s.score);
    const p75 = percentile(scores, 75);
    const minScore = Math.max(0.2, Math.min(0.85, p75 * 0.7));

    // Filter by threshold
    const filtered = similarities.filter((s) => s.score >= minScore);

    // Get max buttons from shop settings (default 15)
    const settings = await prisma.settings.findUnique({
      where: { shopId },
    });
    const maxButtons = settings?.maxButtons || 15;

    // Take top N
    const topN = filtered.slice(0, maxButtons);

    // Create edges
    for (let i = 0; i < topN.length; i++) {
      await prisma.edge.create({
        data: {
          sourceCollectionId: source.id,
          targetCollectionId: topN[i].collectionId,
          score: topN[i].score,
          rank: i + 1,
        },
      });
      edgesCreated++;
    }
  }

  return {
    edgesCreated,
    collectionsProcessed: collections.length,
  };
}

/**
 * Get recommendations for a collection handle
 */
export async function getRecommendations(shopId: string, handle: string) {
  const collection = await prisma.collection.findUnique({
    where: {
      shopId_handle: {
        shopId,
        handle,
      },
    },
  });

  if (!collection || !collection.isEnabled) {
    return [];
  }

  const edges = await prisma.edge.findMany({
    where: {
      sourceCollectionId: collection.id,
    },
    include: {
      targetCollection: true,
    },
    orderBy: {
      rank: "asc",
    },
  });

  return edges.map((edge) => ({
    title: edge.targetCollection.title,
    url: `/collections/${edge.targetCollection.handle}`,
    score: edge.score,
    rank: edge.rank,
  }));
}
