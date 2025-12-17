import OpenAI from "openai";
import prisma from "~/db.server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

/**
 * Build embedding text for a collection
 * Hard cap at 6000 characters to control costs
 */
function buildEmbeddingText(collection: any): string {
  const parts: string[] = [];

  // Title (most important)
  if (collection.title) {
    parts.push(`Title: ${collection.title}`);
  }

  // Description
  if (collection.descriptionText) {
    // Limit description to 5000 chars
    const desc = collection.descriptionText.slice(0, 5000);
    parts.push(`Description: ${desc}`);
  }

  // Gender category
  if (collection.genderCategory && collection.genderCategory !== "unknown") {
    parts.push(`Category: ${collection.genderCategory}`);
  }

  const text = parts.join("\n\n");

  // Hard cap at 6000 characters
  return text.slice(0, 6000);
}

/**
 * Generate embedding for a single collection
 */
export async function generateEmbedding(
  collectionId: string
): Promise<number[]> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: {
      title: true,
      descriptionText: true,
      genderCategory: true,
    },
  });

  if (!collection) {
    throw new Error(`Collection ${collectionId} not found`);
  }

  const text = buildEmbeddingText(collection);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for all collections in a shop
 */
export async function generateAllEmbeddings(shopId: string) {
  const collections = await prisma.collection.findMany({
    where: {
      shopId,
      isExcludedSale: false, // Skip sale collections
    },
    select: {
      id: true,
      title: true,
      descriptionText: true,
      genderCategory: true,
    },
  });

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
  };

  for (const collection of collections) {
    try {
      const text = buildEmbeddingText(collection);

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      const vector = response.data[0].embedding;

      // Store as JSON string
      const existing = await prisma.embedding.findUnique({
        where: { collectionId: collection.id },
      });

      if (existing) {
        await prisma.embedding.update({
          where: { collectionId: collection.id },
          data: {
            embeddingVector: JSON.stringify(vector),
            embeddingModel: EMBEDDING_MODEL,
          },
        });
        results.updated++;
      } else {
        await prisma.embedding.create({
          data: {
            collectionId: collection.id,
            embeddingVector: JSON.stringify(vector),
            embeddingModel: EMBEDDING_MODEL,
          },
        });
        results.created++;
      }

      // Rate limiting - 3500 requests/min for tier 1
      // ~17ms delay to stay under limit
      await new Promise((resolve) => setTimeout(resolve, 20));
    } catch (error) {
      console.error(`Error generating embedding for ${collection.id}:`, error);
      results.errors++;
    }
  }

  return results;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
