import pool from '../database/db.js';

export class SimilarityEngine {
  constructor(shopDomain) {
    this.shopDomain = shopDomain;
  }

  // Check if target URL is a child of source URL (Colab workflow logic)
  isChildCollection(sourceUrl, targetUrl) {
    // Remove trailing slashes for comparison
    const source = sourceUrl.replace(/\/$/, '');
    const target = targetUrl.replace(/\/$/, '');

    // Child relationship exists if target URL starts with source URL
    return target.startsWith(source + '/');
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Find similar collections for a given collection using pgvector
  async findSimilarCollections(collectionId, limit = 5, minSimilarity = 0.85, existingClient = null) {
    const client = existingClient || await pool.connect();
    const shouldRelease = !existingClient;

    try {
      // Get the source collection's embedding and URL
      const sourceResult = await client.query(
        'SELECT embedding, url FROM collections WHERE shop_domain = $1 AND collection_id = $2',
        [this.shopDomain, collectionId]
      );

      if (sourceResult.rows.length === 0 || !sourceResult.rows[0].embedding) {
        throw new Error('Source collection not found or has no embedding');
      }

      const sourceEmbedding = sourceResult.rows[0].embedding;
      const sourceUrl = sourceResult.rows[0].url;

      // Use pgvector's cosine distance operator
      // Note: pgvector uses <=> for cosine distance, which is (1 - cosine similarity)
      const query = `
        SELECT
          collection_id,
          handle,
          title,
          h1_tag,
          description,
          url,
          1 - (embedding <=> $1::vector) AS similarity_score
        FROM collections
        WHERE shop_domain = $2
          AND collection_id != $3
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `;

      // Parse embedding if it's a JSON string, otherwise use as-is
      const embeddingVector = typeof sourceEmbedding === 'string'
        ? sourceEmbedding
        : `[${sourceEmbedding.join(',')}]`;

      const result = await client.query(query, [
        embeddingVector,
        this.shopDomain,
        collectionId,
        limit * 3, // Get more results to filter by threshold and child relationships
      ]);

      // Filter by child relationship and minimum similarity threshold
      // Per Colab: Use 0.99 threshold for child relationships, 0.85 for others
      console.log(`Found ${result.rows.length} potential matches for ${collectionId}`);
      result.rows.forEach(row => {
        console.log(`  - ${row.handle}: score=${row.similarity_score}`);
      });

      const similarCollections = result.rows
        .filter((row) => {
          const isChild = this.isChildCollection(sourceUrl, row.url);

          if (isChild) {
            // Higher threshold for child collections to avoid linking
            return row.similarity_score >= 0.99;
          }

          return row.similarity_score >= minSimilarity;
        })
        .slice(0, limit);

      console.log(`After filtering: ${similarCollections.length} recommendations for ${collectionId}`);
      return similarCollections;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  // Calculate adaptive threshold based on similarity score distribution
  calculateAdaptiveThreshold(allScores, maxRecommendations) {
    if (allScores.length === 0) return 0.50; // Default fallback

    // Sort scores descending
    const sortedScores = [...allScores].sort((a, b) => b - a);

    // Calculate statistics
    const mean = sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length;
    const median = sortedScores[Math.floor(sortedScores.length / 2)];
    const max = sortedScores[0];

    console.log(`Score distribution: min=${sortedScores[sortedScores.length - 1].toFixed(3)}, median=${median.toFixed(3)}, mean=${mean.toFixed(3)}, max=${max.toFixed(3)}`);

    // Adaptive strategy:
    // 1. If max score is high (>0.80), use higher threshold to maintain quality
    // 2. If max score is medium (0.60-0.80), use median-based threshold
    // 3. If max score is low (<0.60), use lower threshold to ensure recommendations

    let threshold;
    if (max >= 0.80) {
      // High similarity case - use 75% of median or 0.60, whichever is higher
      threshold = Math.max(median * 0.75, 0.60);
    } else if (max >= 0.60) {
      // Medium similarity - use 60% of median or 0.45
      threshold = Math.max(median * 0.60, 0.45);
    } else {
      // Low similarity - use 50% of median or 0.35 to ensure some recommendations
      threshold = Math.max(median * 0.50, 0.35);
    }

    // Ensure we get at least some recommendations per collection
    // If threshold would eliminate most recommendations, lower it
    const scoresAboveThreshold = sortedScores.filter(s => s >= threshold).length;
    const avgRecommendationsPerCollection = scoresAboveThreshold / (allScores.length / (maxRecommendations * 3));

    if (avgRecommendationsPerCollection < maxRecommendations * 0.5) {
      // Too few recommendations - lower threshold
      threshold = sortedScores[Math.min(maxRecommendations * 2, sortedScores.length - 1)];
      console.log(`Adjusted threshold to ${threshold.toFixed(3)} to ensure adequate recommendations`);
    }

    console.log(`Adaptive threshold: ${threshold.toFixed(3)} (${scoresAboveThreshold} scores above threshold)`);
    return threshold;
  }

  // Calculate similarities for all collections and store them
  async calculateAllSimilarities(maxRecommendations = 3, minSimilarity = null) {
    const client = await pool.connect();

    try {
      console.log(`Calculating similarities for shop: ${this.shopDomain}`);

      // Get all collections with embeddings
      const result = await client.query(
        'SELECT collection_id, handle, title, h1_tag, description, url, embedding FROM collections WHERE shop_domain = $1 AND embedding IS NOT NULL',
        [this.shopDomain]
      );

      const collections = result.rows;
      console.log(`Found ${collections.length} collections with embeddings`);

      // First pass: calculate all similarity scores to determine adaptive threshold
      console.log('First pass: calculating all similarity scores...');
      const allScores = [];

      for (const collection of collections) {
        const similar = await this.findSimilarCollections(
          collection.collection_id,
          maxRecommendations * 3, // Get more for threshold calculation
          0.0, // No threshold on first pass
          client
        );

        similar.forEach(s => allScores.push(s.similarity_score));
      }

      // Calculate adaptive threshold if not provided
      const threshold = minSimilarity !== null
        ? minSimilarity
        : this.calculateAdaptiveThreshold(allScores, maxRecommendations);

      console.log(`Using similarity threshold: ${threshold.toFixed(3)}`);

      // Begin transaction
      await client.query('BEGIN');

      // Delete existing recommendations for this shop
      await client.query('DELETE FROM collection_recommendations WHERE shop_domain = $1', [this.shopDomain]);

      let totalRelations = 0;

      // Second pass: Calculate similarities for each collection with adaptive threshold
      for (let idx = 0; idx < collections.length; idx++) {
        const collection = collections[idx];

        console.log(
          `Processing ${idx + 1}/${collections.length}: ${collection.handle}`
        );

        const similar = await this.findSimilarCollections(
          collection.collection_id,
          maxRecommendations,
          threshold,
          client // Pass the existing client to reuse the transaction
        );

        // Store recommendations
        for (let i = 0; i < similar.length; i++) {
          await client.query(
            `INSERT INTO collection_recommendations
             (shop_domain, source_collection_id, target_collection_id, similarity_score, recommendation_rank)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              this.shopDomain,
              collection.handle,
              similar[i].handle,
              similar[i].similarity_score,
              i + 1,
            ]
          );
          totalRelations++;
        }
      }

      await client.query('COMMIT');

      // Store the threshold used in shop_settings for reference
      await client.query(
        'UPDATE shop_settings SET min_similarity_threshold = $1, updated_at = NOW() WHERE shop_domain = $2',
        [threshold, this.shopDomain]
      );

      console.log(`Created ${totalRelations} collection recommendations using threshold ${threshold.toFixed(3)}`);

      return {
        collectionsProcessed: collections.length,
        relationsCreated: totalRelations,
        thresholdUsed: threshold,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error calculating similarities:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get related collections for display (cached from database)
  async getRelatedCollections(collectionHandle) {
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          c.handle,
          c.title,
          c.url,
          cr.similarity_score,
          cr.recommendation_rank as position
        FROM collection_recommendations cr
        JOIN collections c ON c.handle = cr.target_collection_id AND c.shop_domain = cr.shop_domain
        WHERE cr.shop_domain = $1
          AND cr.source_collection_id = $2
        ORDER BY cr.recommendation_rank ASC
      `;

      const result = await client.query(query, [this.shopDomain, collectionHandle]);

      return result.rows;
    } finally {
      client.release();
    }
  }
}

export default SimilarityEngine;
