/**
 * PathConvert Auto-Injection Script
 * Automatically adds recommendation buttons below collection intro text or H1
 * No theme editing required!
 */
(function() {
  // Only run on collection pages
  if (!window.location.pathname.includes('/collections/')) return;
  if (window.location.pathname === '/collections') return; // Skip collections list page

  // Extract collection handle from URL
  const pathParts = window.location.pathname.split('/');
  const collectionHandle = pathParts[pathParts.indexOf('collections') + 1];
  if (!collectionHandle) return;

  // Get shop domain
  const shopDomain = window.Shopify && window.Shopify.shop;
  if (!shopDomain) return;

  // Create container div
  const container = document.createElement('div');
  container.className = 'pathconvert-recommendations';
  container.style.margin = '2rem 0';
  container.innerHTML = '<div class="pathconvert-loading" style="color: #666; font-size: 0.875rem;">Loading recommendations...</div>';

  // Find injection point: below intro text or H1, above other content
  function findInjectionPoint() {
    // Try to find collection description/intro
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

    // Fallback: below H1
    const h1 = document.querySelector('h1');
    if (h1) {
      return h1.parentNode.insertBefore(container, h1.nextSibling);
    }

    // Last resort: top of main content
    const main = document.querySelector('main') || document.querySelector('#MainContent') || document.body;
    return main.insertBefore(container, main.firstChild);
  }

  findInjectionPoint();

  // Fetch recommendations
  const apiUrl = `/apps/pathconvert/buttons?shop=${encodeURIComponent(shopDomain)}&collectionHandle=${encodeURIComponent(collectionHandle)}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const loadingEl = container.querySelector('.pathconvert-loading');
      if (loadingEl) loadingEl.remove();

      // If no buttons, hide container
      if (!data.buttons || data.buttons.length === 0) {
        container.style.display = 'none';
        return;
      }

      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'pathconvert-buttons-container';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.flexWrap = 'wrap';
      buttonsContainer.style.gap = '0.75rem';
      buttonsContainer.style.justifyContent = 'flex-start';

      // Render buttons
      data.buttons.forEach(button => {
        const link = document.createElement('a');
        link.href = button.url;
        link.className = 'pathconvert-button';
        link.textContent = button.title;
        link.style.display = 'inline-block';
        link.style.padding = '0.75rem 1.5rem';
        link.style.backgroundColor = '#000';
        link.style.color = '#fff';
        link.style.textDecoration = 'none';
        link.style.borderRadius = '0.25rem';
        link.style.fontSize = '0.875rem';
        link.style.fontWeight = '500';
        link.style.transition = 'background-color 0.2s';

        link.addEventListener('mouseenter', () => {
          link.style.backgroundColor = '#333';
        });
        link.addEventListener('mouseleave', () => {
          link.style.backgroundColor = '#000';
        });

        buttonsContainer.appendChild(link);
      });

      container.appendChild(buttonsContainer);
    })
    .catch(error => {
      console.error('PathConvert error:', error);
      const loadingEl = container.querySelector('.pathconvert-loading');
      if (loadingEl) {
        loadingEl.style.color = '#999';
        loadingEl.textContent = 'Failed to load recommendations';
      }
    });
})();
