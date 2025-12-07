import pool from '../database/db.js';
import AnchorTextGenerator from './anchor-text-generator.js';

export class SimilarityEngine {
  constructor(shopDomain) {
    this.shopDomain = shopDomain;
    this.anchorTextGenerator = new AnchorTextGenerator();
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
  async findSimilarCollections(collectionId, limit = 5, minSimilarity = 0.85) {
    const client = await pool.connect();

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

      const result = await client.query(query, [
        `[${sourceEmbedding.join(',')}]`,
        this.shopDomain,
        collectionId,
        limit * 3, // Get more results to filter by threshold and child relationships
      ]);

      // Filter by child relationship and minimum similarity threshold
      // Per Colab: Use 0.99 threshold for child relationships, 0.85 for others
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

      return similarCollections;
    } finally {
      client.release();
    }
  }

  // Calculate similarities for all collections and store them
  async calculateAllSimilarities(maxRecommendations = 7, minSimilarity = 0.85) {
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

      // Begin transaction
      await client.query('BEGIN');

      // Delete existing related collections for this shop
      await client.query('DELETE FROM related_collections WHERE shop_domain = $1', [this.shopDomain]);

      let totalRelations = 0;

      // Calculate similarities for each collection
      for (let idx = 0; idx < collections.length; idx++) {
        const collection = collections[idx];

        console.log(
          `Processing ${idx + 1}/${collections.length}: ${collection.handle}`
        );

        const similar = await this.findSimilarCollections(
          collection.collection_id,
          maxRecommendations,
          minSimilarity
        );

        // Generate anchor text for each similar collection
        const anchorTextPairs = similar.map((target) => ({
          source: {
            title: collection.title,
            description: collection.description,
            h1Tag: collection.h1_tag,
          },
          target: {
            title: target.title,
            description: target.description,
            h1Tag: target.h1_tag,
          },
        }));

        console.log(`Generating anchor text for ${similar.length} links...`);
        const anchorTexts = await this.anchorTextGenerator.generateBatch(anchorTextPairs);

        // Store related collections with anchor text
        for (let i = 0; i < similar.length; i++) {
          const anchorTextData = anchorTexts[i];

          await client.query(
            `INSERT INTO related_collections
             (shop_domain, source_collection_id, related_collection_id, similarity_score, anchor_text, anchor_text_source, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              this.shopDomain,
              collection.collection_id,
              similar[i].collection_id,
              similar[i].similarity_score,
              anchorTextData.anchorText,
              anchorTextData.source,
              i + 1,
            ]
          );
          totalRelations++;
        }
      }

      await client.query('COMMIT');

      console.log(`Created ${totalRelations} collection relationships with AI-generated anchor text`);

      return {
        collectionsProcessed: collections.length,
        relationsCreated: totalRelations,
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
          rc.similarity_score,
          rc.anchor_text,
          rc.anchor_text_source,
          rc.position
        FROM related_collections rc
        JOIN collections source ON source.collection_id = rc.source_collection_id
        JOIN collections c ON c.collection_id = rc.related_collection_id
        WHERE rc.shop_domain = $1
          AND source.shop_domain = $1
          AND c.shop_domain = $1
          AND source.handle = $2
        ORDER BY rc.position ASC
      `;

      const result = await client.query(query, [this.shopDomain, collectionHandle]);

      return result.rows;
    } finally {
      client.release();
    }
  }
}

export default SimilarityEngine;
