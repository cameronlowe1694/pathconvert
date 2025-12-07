import pool from '../database/db.js';
import SitemapParser from '../services/sitemap-parser.js';
import CollectionScraper from '../services/collection-scraper.js';
import OpenAIService from '../services/openai-service.js';
import SimilarityEngine from '../services/similarity-engine.js';
import dotenv from 'dotenv';

dotenv.config();

export class CollectionAnalyzer {
  constructor(shopDomain) {
    this.shopDomain = shopDomain;
    this.sitemapParser = new SitemapParser(shopDomain);
    this.scraper = new CollectionScraper(shopDomain);
    this.openai = new OpenAIService();
    this.similarityEngine = new SimilarityEngine(shopDomain);
  }

  async analyze() {
    console.log(`Starting collection analysis for ${this.shopDomain}`);

    try {
      // Step 1: Discover collections from sitemap (0-20%)
      await this.updateProgress(0);
      const collectionUrls = await this.sitemapParser.discoverCollections();

      if (collectionUrls.length === 0) {
        console.log('No collections found in sitemap');
        await this.updateProgress(0);
        return;
      }

      await this.updateProgress(20);

      // Step 2: Scrape and analyze each collection (20-40%)
      const collections = [];
      const totalCollections = collectionUrls.length;

      for (let i = 0; i < collectionUrls.length; i++) {
        const { url } = collectionUrls[i];
        const handle = this.sitemapParser.extractHandleFromUrl(url);

        if (!handle) continue;

        console.log(`Analyzing collection ${i + 1}/${totalCollections}: ${handle}`);

        // Try JSON endpoint first (faster), fallback to scraping
        let collectionData = await this.scraper.fetchCollectionJSON(handle);

        if (!collectionData || collectionData.productCount === 0) {
          collectionData = await this.scraper.scrapeCollection(url);
        }

        if (collectionData) {
          collections.push({
            handle,
            url,
            ...collectionData,
          });
        }

        // Update progress (20-40%)
        const progress = 20 + Math.floor((i / totalCollections) * 20);
        await this.updateProgress(progress);

        // Small delay to avoid overwhelming the server
        await this.sleep(500);
      }

      console.log(`Scraped ${collections.length} collections`);
      await this.updateProgress(40);

      // Step 3: Generate embeddings (40-70%)
      console.log('Generating embeddings...');
      const embeddings = await this.openai.generateBatchEmbeddings(collections);
      await this.updateProgress(70);

      // Step 4: Store collections with embeddings in database (70-90%)
      await this.storeCollections(collections, embeddings);
      await this.updateProgress(90);

      // Step 5: Calculate similarities (90-100%)
      const settings = await this.getShopSettings();
      await this.similarityEngine.calculateAllSimilarities(
        settings.max_recommendations,
        settings.min_similarity_threshold
      );

      // Update last sync time and complete progress
      await this.updateLastSync();
      await this.updateProgress(100);

      console.log('Collection analysis completed successfully');

      return {
        collectionsAnalyzed: collections.length,
        success: true,
      };
    } catch (error) {
      console.error('Collection analysis failed:', error);
      await this.updateProgress(0); // Reset on error
      throw error;
    }
  }

  async storeCollections(collections, embeddings) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        const embedding = embeddings[i];

        if (!embedding) {
          console.warn(`Skipping collection ${collection.handle} - no embedding generated`);
          continue;
        }

        // Generate a collection_id (using handle as unique identifier)
        const collectionId = collection.handle;

        await client.query(
          `INSERT INTO collections
           (shop_domain, collection_id, handle, title, h1_tag, description, url, product_count, embedding, last_analyzed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (shop_domain, collection_id)
           DO UPDATE SET
             title = $4,
             h1_tag = $5,
             description = $6,
             product_count = $8,
             embedding = $9,
             last_analyzed = NOW(),
             updated_at = NOW()`,
          [
            this.shopDomain,
            collectionId,
            collection.handle,
            collection.title,
            collection.h1Tag || collection.title, // Fallback to title if no H1
            collection.description || '',
            collection.url,
            collection.productCount || 0,
            `[${embedding.join(',')}]`,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`Stored ${collections.length} collections in database`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getShopSettings() {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM shop_settings WHERE shop_domain = $1', [
        this.shopDomain,
      ]);

      if (result.rows.length === 0) {
        return {
          max_recommendations: 7, // Top 7 matching Colab workflow
          min_similarity_threshold: 0.85, // 0.85 matching Colab workflow
        };
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateLastSync() {
    const client = await pool.connect();

    try {
      await client.query(
        'UPDATE shop_settings SET last_sync = NOW() WHERE shop_domain = $1',
        [this.shopDomain]
      );
    } finally {
      client.release();
    }
  }

  async updateProgress(progress) {
    const client = await pool.connect();

    try {
      // Ensure shop_settings exists
      await client.query(
        `INSERT INTO shop_settings (shop_domain, analysis_progress)
         VALUES ($1, $2)
         ON CONFLICT (shop_domain)
         DO UPDATE SET analysis_progress = $2, updated_at = NOW()`,
        [this.shopDomain, progress]
      );

      console.log(`Progress: ${progress}%`);
    } catch (error) {
      console.error('Failed to update progress:', error.message);
    } finally {
      client.release();
    }
  }

  async getProgress() {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT analysis_progress FROM shop_settings WHERE shop_domain = $1',
        [this.shopDomain]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      return result.rows[0].analysis_progress || 0;
    } finally {
      client.release();
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const shopDomain = process.argv[2];

  if (!shopDomain) {
    console.error('Usage: node analyze-collections.js <shop-domain>');
    process.exit(1);
  }

  const analyzer = new CollectionAnalyzer(shopDomain);
  analyzer
    .analyze()
    .then(() => {
      console.log('Analysis complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

export default CollectionAnalyzer;
