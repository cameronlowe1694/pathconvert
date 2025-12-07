import axios from 'axios';
import xml2js from 'xml2js';

const parser = new xml2js.Parser();

export class SitemapParser {
  constructor(shopDomain) {
    this.shopDomain = shopDomain;
    this.baseUrl = `https://${shopDomain}`;
  }

  async discoverCollections() {
    try {
      console.log(`Discovering collections for ${this.shopDomain}...`);

      // Try to fetch main sitemap
      const mainSitemap = await this.fetchSitemap(`${this.baseUrl}/sitemap.xml`);

      let collectionSitemaps = [];

      if (mainSitemap) {
        // Extract collection sitemaps from main sitemap
        collectionSitemaps = this.extractCollectionSitemaps(mainSitemap);
      }

      // If no collection sitemaps found, try direct collection sitemap URL
      // (Development stores often don't have sitemap.xml but have sitemap_collections_1.xml)
      if (collectionSitemaps.length === 0) {
        console.log('No collection sitemaps in main sitemap, trying direct URL...');
        collectionSitemaps = [`${this.baseUrl}/sitemap_collections_1.xml`];
      }

      let allCollectionUrls = [];

      // Fetch each collection sitemap
      for (const sitemapUrl of collectionSitemaps) {
        const sitemap = await this.fetchSitemap(sitemapUrl);
        if (sitemap) {
          const urls = this.extractCollectionUrls(sitemap);
          allCollectionUrls = allCollectionUrls.concat(urls);
        }
      }

      console.log(`Found ${allCollectionUrls.length} collection URLs`);
      return allCollectionUrls;
    } catch (error) {
      console.error('Error discovering collections:', error.message);
      throw error;
    }
  }

  async fetchSitemap(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PathConvert Collection Analyzer/1.0',
        },
        timeout: 10000,
      });

      return await parser.parseStringPromise(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Sitemap not found: ${url}`);
        return null;
      }
      throw error;
    }
  }

  extractCollectionSitemaps(mainSitemap) {
    if (!mainSitemap || !mainSitemap.sitemapindex) {
      return [];
    }

    const sitemaps = mainSitemap.sitemapindex.sitemap || [];
    const collectionSitemaps = [];

    for (const sitemap of sitemaps) {
      const loc = sitemap.loc?.[0];
      if (loc && loc.includes('sitemap_collections')) {
        collectionSitemaps.push(loc);
      }
    }

    return collectionSitemaps;
  }

  extractCollectionUrls(sitemap) {
    if (!sitemap || !sitemap.urlset) {
      return [];
    }

    const urls = sitemap.urlset.url || [];
    const collectionUrls = [];

    for (const url of urls) {
      const loc = url.loc?.[0];
      if (loc && this.isCollectionUrl(loc)) {
        collectionUrls.push({
          url: loc,
          lastmod: url.lastmod?.[0],
        });
      }
    }

    return collectionUrls;
  }

  isCollectionUrl(url) {
    // Collection URLs typically follow: /collections/{handle}
    const collectionPattern = /\/collections\/[^/]+$/;
    return collectionPattern.test(new URL(url).pathname);
  }

  extractHandleFromUrl(url) {
    const match = url.match(/\/collections\/([^/]+)$/);
    return match ? match[1] : null;
  }
}

export default SitemapParser;
