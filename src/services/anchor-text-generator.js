import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class AnchorTextGenerator {
  /**
   * Generate AI-powered anchor text for a link from source to target collection
   * @param {Object} sourceCollection - Source collection data
   * @param {Object} targetCollection - Target collection data
   * @returns {Object} - { anchorText, source: 'ai_generated'|'h1_tag'|'title' }
   */
  async generateAnchorText(sourceCollection, targetCollection) {
    try {
      // Try AI generation first
      const aiText = await this.generateWithAI(sourceCollection, targetCollection);

      if (aiText) {
        return {
          anchorText: aiText,
          source: 'ai_generated',
        };
      }
    } catch (error) {
      console.error('AI anchor text generation failed:', error.message);
    }

    // Fallback hierarchy: H1 tag -> title
    if (targetCollection.h1Tag && targetCollection.h1Tag.trim()) {
      return {
        anchorText: targetCollection.h1Tag.trim(),
        source: 'h1_tag',
      };
    }

    return {
      anchorText: targetCollection.title,
      source: 'title',
    };
  }

  /**
   * Generate anchor text using OpenAI
   */
  async generateWithAI(sourceCollection, targetCollection) {
    const prompt = this.buildPrompt(sourceCollection, targetCollection);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: GPT_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an SEO expert specializing in e-commerce internal linking. Generate natural, contextual anchor text that entices users to click while being SEO-friendly.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 20,
        });

        const anchorText = response.choices[0].message.content.trim();

        // Clean up the anchor text (remove quotes if present)
        const cleanedText = anchorText.replace(/^["']|["']$/g, '');

        // Validate length (3-6 words ideal)
        const wordCount = cleanedText.split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 8 && cleanedText.length <= 60) {
          return cleanedText;
        }

        console.warn(`Generated anchor text has ${wordCount} words, retrying...`);
      } catch (error) {
        console.error(`AI generation attempt ${attempt} failed:`, error.message);

        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY * attempt);
        }
      }
    }

    return null;
  }

  /**
   * Build prompt for AI anchor text generation
   */
  buildPrompt(sourceCollection, targetCollection) {
    return `Given a user browsing the "${sourceCollection.title}" collection, generate a natural, SEO-friendly anchor text (3-6 words) that would entice them to click through to the "${targetCollection.title}" collection.

Source Collection: "${sourceCollection.title}"
${sourceCollection.description ? `Description: "${sourceCollection.description.substring(0, 150)}"` : ''}

Target Collection: "${targetCollection.title}"
${targetCollection.description ? `Description: "${targetCollection.description.substring(0, 150)}"` : ''}

Return ONLY the anchor text, nothing else. Make it contextual, engaging, and natural. Examples of good anchor text:
- "Shop Women's Running Shoes"
- "Explore Vegan Protein Options"
- "Browse Winter Collection"
- "View Men's Accessories"

Your anchor text:`;
  }

  /**
   * Generate anchor text for multiple collection pairs in batch
   * @param {Array} pairs - Array of {source, target} collection objects
   * @returns {Array} - Array of {anchorText, source} objects
   */
  async generateBatch(pairs) {
    const results = [];
    const batchSize = 5; // Smaller batches to avoid rate limits

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);

      const batchPromises = batch.map((pair) =>
        this.generateAnchorText(pair.source, pair.target).catch((error) => {
          console.error(`Failed to generate anchor text:`, error.message);
          // Return fallback
          return {
            anchorText: pair.target.h1Tag || pair.target.title,
            source: pair.target.h1Tag ? 'h1_tag' : 'title',
          };
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches to respect rate limits
      if (i + batchSize < pairs.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AnchorTextGenerator;
