import shopify from '../config/shopify.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../database/db.js';

export class ThemeService {
  constructor(shop, accessToken) {
    this.shop = shop;
    this.client = new shopify.clients.Rest({
      session: { shop, accessToken },
    });
  }

  // Install script tag for stores
  async installScriptTag() {
    try {
      const scriptSrc = `${process.env.APP_URL}/storefront/storefront-script.js`;

      // Check if script already exists
      const existingScripts = await this.client.get({
        path: 'script_tags',
      });

      const exists = existingScripts.body.script_tags?.some(
        (tag) => tag.src === scriptSrc
      );

      if (exists) {
        console.log('Script tag already installed');
        return;
      }

      // Create new script tag
      await this.client.post({
        path: 'script_tags',
        data: {
          script_tag: {
            event: 'onload',
            src: scriptSrc,
            display_scope: 'all',
          },
        },
      });

      console.log('Script tag installed successfully');
    } catch (error) {
      console.error('Failed to install script tag:', error.message);
      throw error;
    }
  }

  // Detect and extract theme styles
  async detectThemeStyles() {
    try {
      // Get active theme
      const themesResponse = await this.client.get({
        path: 'themes',
      });

      const activeTheme = themesResponse.body.themes?.find((theme) => theme.role === 'main');

      if (!activeTheme) {
        throw new Error('No active theme found');
      }

      console.log(`Active theme: ${activeTheme.name} (ID: ${activeTheme.id})`);

      // Get theme settings
      const settingsData = await this.client.get({
        path: `themes/${activeTheme.id}/assets`,
        query: { 'asset[key]': 'config/settings_data.json' },
      });

      const settings = JSON.parse(settingsData.body.asset?.value || '{}');

      // Extract button styles from theme settings
      const buttonStyles = this.extractButtonStyles(settings);

      // Also scrape homepage to detect actual rendered styles
      const renderedStyles = await this.scrapeHomepageStyles();

      // Merge and return
      const finalStyles = {
        ...buttonStyles,
        ...renderedStyles,
        themeName: activeTheme.name,
        themeId: activeTheme.id,
      };

      // Store styles in database
      await this.saveThemeStyles(finalStyles);

      return finalStyles;
    } catch (error) {
      console.error('Failed to detect theme styles:', error.message);
      return this.getDefaultStyles();
    }
  }

  extractButtonStyles(settings) {
    const current = settings.current || {};
    const colors = current.colors || {};

    return {
      primaryColor: colors.button_background || colors.accent || '#000000',
      primaryTextColor: colors.button_text || '#ffffff',
      secondaryColor: colors.background || '#f5f5f5',
      secondaryTextColor: colors.text || '#000000',
      borderRadius: current.buttons_radius || '4px',
      fontFamily: current.type_base_family || 'sans-serif',
      fontSize: current.type_base_size || '16px',
    };
  }

  async scrapeHomepageStyles() {
    try {
      const url = `https://${this.shop}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'PathConvert Theme Analyzer/1.0',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Look for primary buttons
      const buttonSelectors = [
        'button[type="submit"]',
        '.btn-primary',
        '.button--primary',
        '.shopify-payment-button__button',
        'button.button',
      ];

      let styles = {};

      for (const selector of buttonSelectors) {
        const button = $(selector).first();

        if (button.length > 0) {
          // Extract inline styles or classes
          const style = button.attr('style') || '';
          const bgMatch = style.match(/background-color:\s*([^;]+)/);
          const colorMatch = style.match(/color:\s*([^;]+)/);

          if (bgMatch) {
            styles.primaryColor = bgMatch[1].trim();
          }

          if (colorMatch) {
            styles.primaryTextColor = colorMatch[1].trim();
          }

          break;
        }
      }

      return styles;
    } catch (error) {
      console.error('Failed to scrape homepage styles:', error.message);
      return {};
    }
  }

  async saveThemeStyles(styles) {
    const client = await pool.connect();

    try {
      await client.query(
        `UPDATE shop_settings
         SET button_style = $2, updated_at = NOW()
         WHERE shop_domain = $1`,
        [this.shop, JSON.stringify(styles)]
      );
    } finally {
      client.release();
    }
  }

  getDefaultStyles() {
    return {
      primaryColor: '#000000',
      primaryTextColor: '#ffffff',
      secondaryColor: '#f5f5f5',
      secondaryTextColor: '#000000',
      borderRadius: '4px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
    };
  }

  // Generate CSS based on detected styles
  generateCustomCSS(styles) {
    return `
      .pathconvert-button--primary {
        background-color: ${styles.primaryColor} !important;
        color: ${styles.primaryTextColor} !important;
        border-color: ${styles.primaryColor} !important;
        border-radius: ${styles.borderRadius} !important;
        font-family: ${styles.fontFamily} !important;
      }

      .pathconvert-button--primary:hover {
        opacity: 0.9;
      }

      .pathconvert-heading {
        font-family: ${styles.fontFamily} !important;
      }
    `;
  }
}

export default ThemeService;
