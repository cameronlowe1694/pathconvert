import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = process.env.OPENAI_MODEL || 'text-embedding-3-small';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class OpenAIService {
  async generateEmbedding(collectionData) {
    const text = this.prepareTextForEmbedding(collectionData);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: text,
          encoding_format: 'float',
        });

        return response.data[0].embedding;
      } catch (error) {
        console.error(`Embedding generation attempt ${attempt} failed:`, error.message);

        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY * attempt);
        } else {
          throw new Error(`Failed to generate embedding after ${MAX_RETRIES} attempts`);
        }
      }
    }
  }

  async generateBatchEmbeddings(collectionsData) {
    const embeddings = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;

    for (let i = 0; i < collectionsData.length; i += batchSize) {
      const batch = collectionsData.slice(i, i + batchSize);

      const batchPromises = batch.map((collection) =>
        this.generateEmbedding(collection).catch((error) => {
          console.error(`Failed to generate embedding for ${collection.title}:`, error.message);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < collectionsData.length) {
        await this.sleep(500);
      }
    }

    return embeddings;
  }

  prepareTextForEmbedding(collectionData) {
    const { title, description, products } = collectionData;

    // Weighted text construction:
    // - Title is most important (repeated 3x)
    // - Description is moderately important
    // - Product titles provide context

    const parts = [];

    // Add title with high weight
    if (title) {
      parts.push(title, title, title);
    }

    // Add description
    if (description) {
      parts.push(description);
    }

    // Add product titles (limit to first 15)
    if (products && products.length > 0) {
      const productList = products.slice(0, 15).join(', ');
      parts.push(`Products: ${productList}`);
    }

    return parts.join(' ').substring(0, 8000); // OpenAI token limit safety
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default OpenAIService;
