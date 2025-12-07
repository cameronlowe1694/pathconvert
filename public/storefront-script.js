/**
 * PathConvert - Collection Cross-Link Script
 * Automatically displays related collection buttons above product grids
 */

(function() {
  'use strict';

  const CONFIG = {
    APP_URL: window.PATHCONVERT_APP_URL || 'https://your-app-url.com',
    MAX_BUTTONS: 4,
    MIN_SIMILARITY: 0.7,
    BUTTON_STYLE: 'primary',
    HEADING_TEXT: 'You might also like',
  };

  // Only run on collection pages
  if (!isCollectionPage()) {
    return;
  }

  const shop = getShopDomain();
  const collectionHandle = getCollectionHandle();

  if (!collectionHandle) {
    console.warn('PathConvert: Could not detect collection handle');
    return;
  }

  // Initialize
  init();

  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertButtons);
    } else {
      insertButtons();
    }
  }

  function isCollectionPage() {
    return window.location.pathname.includes('/collections/') &&
           !window.location.pathname.includes('/products/');
  }

  function getShopDomain() {
    return window.Shopify?.shop || window.location.hostname;
  }

  function getCollectionHandle() {
    const match = window.location.pathname.match(/\/collections\/([^/?]+)/);
    return match ? match[1] : null;
  }

  async function insertButtons() {
    try {
      // Fetch related collections
      const response = await fetch(
        `${CONFIG.APP_URL}/api/collections/${collectionHandle}/related?shop=${shop}`
      );

      const data = await response.json();

      if (!data.success || !data.related || data.related.length === 0) {
        return; // No recommendations
      }

      const related = data.related.slice(0, CONFIG.MAX_BUTTONS);

      // Find insertion point (before product grid)
      const insertionPoint = findInsertionPoint();

      if (!insertionPoint) {
        console.warn('PathConvert: Could not find product grid insertion point');
        return;
      }

      // Create and insert button container
      const container = createButtonContainer(related);
      insertionPoint.parentNode.insertBefore(container, insertionPoint);

      // Apply theme-matched styles
      applyThemeStyles();

    } catch (error) {
      console.error('PathConvert: Failed to load related collections', error);
    }
  }

  function findInsertionPoint() {
    // Common selectors for product grids
    const selectors = [
      '#product-grid',
      '.product-grid',
      '.collection-products',
      '[data-section-type="collection"] .grid',
      '.collection__main .grid',
      '#CollectionProductGrid',
      '[id*="product-grid"]',
      '[class*="product-grid"]',
      '.products',
      '.product-list',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.children.length > 0) {
        return element;
      }
    }

    return null;
  }

  function createButtonContainer(collections) {
    const container = document.createElement('div');
    container.className = 'pathconvert-related-collections';
    container.setAttribute('data-pathconvert', 'true');

    container.innerHTML = `
      <div class="pathconvert-container">
        <h2 class="pathconvert-heading">${CONFIG.HEADING_TEXT}</h2>
        <div class="pathconvert-buttons">
          ${collections.map(col => createButton(col)).join('')}
        </div>
      </div>
    `;

    // Inject styles
    injectStyles();

    // Add click tracking
    addClickTracking(container);

    return container;
  }

  function createButton(collection) {
    const url = collection.url || `/collections/${collection.handle}`;
    const title = collection.title;

    return `
      <a
        href="${url}"
        class="pathconvert-button pathconvert-button--${CONFIG.BUTTON_STYLE}"
        data-target="${collection.handle}"
      >
        Shop ${title}
      </a>
    `;
  }

  function injectStyles() {
    if (document.getElementById('pathconvert-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'pathconvert-styles';
    style.textContent = `
      .pathconvert-related-collections {
        margin: 3rem auto 2rem;
        padding: 2rem 1rem;
        background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.02) 100%);
      }

      .pathconvert-container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .pathconvert-heading {
        font-size: 1.75rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        text-align: center;
        letter-spacing: -0.02em;
      }

      .pathconvert-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        align-items: center;
      }

      .pathconvert-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.875rem 1.75rem;
        font-size: 1rem;
        font-weight: 600;
        text-decoration: none;
        border-radius: 6px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid transparent;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .pathconvert-button--primary {
        background-color: #000;
        color: #fff;
        border-color: #000;
      }

      .pathconvert-button--primary:hover {
        background-color: #333;
        border-color: #333;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .pathconvert-button--secondary {
        background-color: #f8f8f8;
        color: #000;
        border-color: #e0e0e0;
      }

      .pathconvert-button--secondary:hover {
        background-color: #e8e8e8;
        border-color: #d0d0d0;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .pathconvert-button--outline {
        background-color: transparent;
        color: #000;
        border-color: #000;
      }

      .pathconvert-button--outline:hover {
        background-color: #000;
        color: #fff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      @media (max-width: 768px) {
        .pathconvert-related-collections {
          margin: 2rem auto 1.5rem;
          padding: 1.5rem 0.75rem;
        }

        .pathconvert-heading {
          font-size: 1.375rem;
        }

        .pathconvert-buttons {
          flex-direction: column;
          gap: 0.75rem;
        }

        .pathconvert-button {
          width: 100%;
          max-width: 400px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function addClickTracking(container) {
    const buttons = container.querySelectorAll('.pathconvert-button');

    buttons.forEach(button => {
      button.addEventListener('click', function() {
        const target = this.getAttribute('data-target');

        fetch(`${CONFIG.APP_URL}/api/analytics/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop,
            source: collectionHandle,
            target,
          }),
        }).catch(() => {}); // Silently fail
      });
    });
  }

  function applyThemeStyles() {
    // Detect and match theme button styles
    setTimeout(() => {
      const themeButton = document.querySelector(
        'button[type="submit"], .btn-primary, .button--primary, [class*="button"]'
      );

      if (!themeButton) return;

      const styles = window.getComputedStyle(themeButton);
      const buttons = document.querySelectorAll('.pathconvert-button--primary');

      buttons.forEach(button => {
        // Match background and text colors
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        const borderRadius = styles.borderRadius;
        const fontFamily = styles.fontFamily;

        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          button.style.backgroundColor = bgColor;
          button.style.borderColor = bgColor;
        }

        if (textColor) {
          button.style.color = textColor;
        }

        if (borderRadius) {
          button.style.borderRadius = borderRadius;
        }

        if (fontFamily) {
          button.style.fontFamily = fontFamily;
        }
      });
    }, 500);
  }

})();
