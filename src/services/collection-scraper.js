import axios from 'axios';
import * as cheerio from 'cheerio';

export class CollectionScraper {
  constructor(shopDomain) {
    this.shopDomain = shopDomain;
  }

  async scrapeCollection(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PathConvert Collection Analyzer/1.0',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract collection data
      const title = this.extractTitle($);
      const h1Tag = this.extractH1($);
      const description = this.extractDescription($);
      const products = this.extractProducts($);

      return {
        title,
        h1Tag,
        description,
        products,
        productCount: products.length,
      };
    } catch (error) {
      console.error(`Error scraping collection ${url}:`, error.message);
      return null;
    }
  }

  extractH1($) {
    // Extract H1 tag for use as anchor text fallback
    // This is critical for the Colab workflow compatibility
    const h1 = $('h1').first().text().trim();
    return h1 || '';
  }

  extractTitle($) {
    // Try multiple selectors for collection title
    const selectors = [
      'h1.collection-title',
      'h1.page-title',
      '.collection-header h1',
      'h1[class*="collection"]',
      'h1',
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title) return title;
    }

    // Fallback to meta title
    return $('meta[property="og:title"]').attr('content') || '';
  }

  extractDescription($) {
    // Try multiple selectors for collection description
    const selectors = [
      '.collection-description',
      '.rte.collection__description',
      '[class*="collection-desc"]',
      'meta[name="description"]',
      'meta[property="og:description"]',
    ];

    for (const selector of selectors) {
      if (selector.startsWith('meta')) {
        const desc = $(selector).attr('content');
        if (desc) return desc.trim();
      } else {
        const desc = $(selector).first().text().trim();
        if (desc) return desc;
      }
    }

    return '';
  }

  extractProducts($) {
    const products = [];

    // Try multiple selectors for product cards
    const selectors = [
      '.product-card .product-card__title',
      '.product-item .product-item__title',
      '[class*="product"] [class*="title"]',
      'a[href*="/products/"]',
    ];

    for (const selector of selectors) {
      const elements = $(selector);

      if (elements.length > 0) {
        elements.each((i, elem) => {
          if (i >= 20) return false; // Limit to first 20 products

          const text = $(elem).text().trim();
          if (text && text.length > 0 && text.length < 200) {
            products.push(text);
          }
        });

        if (products.length > 0) break;
      }
    }

    return [...new Set(products)]; // Remove duplicates
  }

  // Alternative: Use Shopify's JSON endpoint
  async fetchCollectionJSON(handle) {
    try {
      const url = `https://${this.shopDomain}/collections/${handle}/products.json?limit=20`;

      const response = await axios.get(url, {
        timeout: 10000,
      });

      const products = response.data.products || [];

      return {
        productCount: products.length,
        products: products.map((p) => p.title),
      };
    } catch (error) {
      console.error(`Error fetching collection JSON for ${handle}:`, error.message);
      return null;
    }
  }
}

export default CollectionScraper;
