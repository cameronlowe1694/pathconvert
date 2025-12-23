import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { getRecommendations } from '../services/similarity.js';
import { getEntitlement } from '../services/entitlement.js';

const router = Router();

/**
 * Verify HMAC signature from Shopify App Proxy
 */
function verifyHMAC(query: any): boolean {
  const { signature, ...params } = query;

  if (!signature) return false;

  // Build query string (sorted by key)
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('');

  // Calculate HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(sortedParams)
    .digest('hex');

  return hash === signature;
}

/**
 * GET /apps/pathconvert/script.js - Serve auto-injection script
 */
router.get('/script.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  // Return the script content directly
  const scriptContent = `
/**
 * PathConvert Auto-Injection Script
 * Automatically adds recommendation buttons below collection intro text or H1
 */
(function() {
  // Only run on collection pages
  if (!window.location.pathname.includes('/collections/')) return;
  if (window.location.pathname === '/collections') return;

  const pathParts = window.location.pathname.split('/');
  const collectionHandle = pathParts[pathParts.indexOf('collections') + 1];
  if (!collectionHandle) return;

  const shopDomain = window.Shopify && window.Shopify.shop;
  if (!shopDomain) return;

  const container = document.createElement('div');
  container.className = 'pathconvert-recommendations';
  container.style.margin = '2rem 0';
  container.innerHTML = '<div class="pathconvert-loading" style="color: #666; font-size: 0.875rem;">Loading recommendations...</div>';

  function findInjectionPoint() {
    const selectors = [
      '.collection__description',
      '.collection-description',
      '.collection-intro',
      '[class*="collection"][class*="description"]',
      '.rte',
      'h1 + div.rte',
      'h1 + p',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.parentNode.insertBefore(container, element.nextSibling);
      }
    }

    const h1 = document.querySelector('h1');
    if (h1) {
      return h1.parentNode.insertBefore(container, h1.nextSibling);
    }

    const main = document.querySelector('main') || document.querySelector('#MainContent') || document.body;
    return main.insertBefore(container, main.firstChild);
  }

  findInjectionPoint();

  const apiUrl = '/apps/pathconvert/buttons?shop=' + encodeURIComponent(shopDomain) + '&collectionHandle=' + encodeURIComponent(collectionHandle);

  fetch(apiUrl)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      const loadingEl = container.querySelector('.pathconvert-loading');
      if (loadingEl) loadingEl.remove();

      if (!data.buttons || data.buttons.length === 0) {
        container.style.display = 'none';
        return;
      }

      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'pathconvert-buttons-container';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.flexWrap = 'wrap';
      buttonsContainer.style.gap = '0.75rem';

      // Apply alignment from settings
      var alignment = data.alignment || 'left';
      if (alignment === 'center') {
        buttonsContainer.style.justifyContent = 'center';
      } else if (alignment === 'right') {
        buttonsContainer.style.justifyContent = 'flex-end';
      } else {
        buttonsContainer.style.justifyContent = 'flex-start';
      }

      // Determine border radius based on button style
      var buttonStyle = data.buttonStyle || 'rounded';
      var borderRadius = '0.25rem'; // default rounded
      if (buttonStyle === 'pill') {
        borderRadius = '9999px';
      } else if (buttonStyle === 'square') {
        borderRadius = '0';
      }

      // Get theme's paragraph styles for typography inheritance
      var themeParagraph = document.querySelector('p, .rte, .product-description') || document.body;
      var computedStyle = window.getComputedStyle(themeParagraph);
      var themeFontFamily = computedStyle.fontFamily;
      var themeFontSize = computedStyle.fontSize;
      var themeTextColor = computedStyle.color;

      data.buttons.forEach(function(button) {
        const link = document.createElement('a');
        link.href = button.url;
        link.className = 'pathconvert-button';
        link.textContent = button.title;
        link.style.display = 'inline-block';
        link.style.padding = '0.75rem 1.5rem';
        link.style.backgroundColor = 'transparent';
        link.style.color = themeTextColor;
        link.style.border = '1.5px solid ' + themeTextColor;
        link.style.textDecoration = 'none';
        link.style.borderRadius = borderRadius;
        link.style.fontFamily = themeFontFamily;
        link.style.fontSize = themeFontSize;
        link.style.fontWeight = '500';
        link.style.transition = 'all 0.2s ease';
        link.style.cursor = 'pointer';

        link.addEventListener('mouseenter', function() {
          link.style.backgroundColor = themeTextColor;
          link.style.color = '#fff';
        });
        link.addEventListener('mouseleave', function() {
          link.style.backgroundColor = 'transparent';
          link.style.color = themeTextColor;
        });

        buttonsContainer.appendChild(link);
      });

      container.appendChild(buttonsContainer);
    })
    .catch(function(error) {
      console.error('PathConvert error:', error);
      const loadingEl = container.querySelector('.pathconvert-loading');
      if (loadingEl) {
        loadingEl.style.color = '#999';
        loadingEl.textContent = 'Failed to load recommendations';
      }
    });
})();
  `;
  res.send(scriptContent);
});

/**
 * GET /apps/pathconvert/buttons - Render collection recommendation buttons
 */
router.get('/buttons', async (req, res) => {
  try {
    const { shop, collectionHandle, path_prefix } = req.query;

    // Support both App Proxy (with HMAC) and direct calls (from script tag)
    const isAppProxy = !!req.query.signature;

    if (isAppProxy && !verifyHMAC(req.query)) {
      console.error('Invalid HMAC signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    // Extract collection handle from path_prefix (App Proxy) or collectionHandle (direct)
    // path_prefix format: /collections/mens-clothing
    let handle = '';
    if (typeof collectionHandle === 'string' && collectionHandle) {
      handle = collectionHandle;
    } else if (typeof path_prefix === 'string') {
      handle = path_prefix.replace('/collections/', '');
    }

    if (!handle) {
      // Not on a collection page
      return res.json({ buttons: [] });
    }

    // Get shop from database
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      select: {
        id: true,
        cacheVersion: true,
        settings: true,
      },
    });

    if (!shopRecord) {
      return res.json({ buttons: [] });
    }

    // Check entitlement
    const entitlement = await getEntitlement(shopRecord.id);
    if (!entitlement.canRenderButtons) {
      return res.json({
        buttons: [],
        message: 'Subscription required',
      });
    }

    // Get recommendations
    const recommendations = await getRecommendations(shopRecord.id, handle);

    // Apply maxButtons limit from settings (default 15)
    const maxButtons = shopRecord.settings?.maxButtons || 15;
    const limitedRecommendations = recommendations.slice(0, maxButtons);

    // Format buttons
    const buttons = limitedRecommendations.map((rec: any) => ({
      title: rec.title,
      url: rec.url,
      score: rec.score,
      rank: rec.rank,
    }));

    res.json({
      buttons,
      cacheVersion: shopRecord.cacheVersion,
      buttonStyle: shopRecord.settings?.buttonStyle || 'rounded',
      alignment: shopRecord.settings?.alignment || 'left',
    });
  } catch (error) {
    console.error('App proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
