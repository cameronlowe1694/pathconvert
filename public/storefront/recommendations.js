// PathConvert - Collection Recommendation Buttons
(function() {
  'use strict';

  // Get shop domain from current URL
  const shopDomain = window.location.hostname;

  // Check if we're on a collection page
  const pathParts = window.location.pathname.split('/');
  const isCollectionPage = pathParts[1] === 'collections' && pathParts[2];

  if (!isCollectionPage) {
    console.log('PathConvert: Not a collection page, skipping');
    return;
  }

  const currentHandle = pathParts[2];
  console.log('PathConvert: Loading recommendations for collection:', currentHandle);

  // Fetch related collections from API
  fetch(`https://pathconvert.onrender.com/api/collections/${currentHandle}/related?shop=${shopDomain}`)
    .then(response => response.json())
    .then(data => {
      if (!data.success || !data.related || data.related.length === 0) {
        console.log('PathConvert: No recommendations found');
        return;
      }

      console.log('PathConvert: Found', data.related.length, 'recommendations');

      // Create recommendation container
      const container = document.createElement('div');
      container.className = 'pathconvert-recommendations';
      container.style.cssText = `
        margin: 20px 0;
        padding: 0;
      `;

      // Create horizontal flex container for buttons (left-aligned)
      const grid = document.createElement('div');
      grid.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      `;

      // Add each recommendation as a compact button
      data.related.forEach(collection => {
        const card = document.createElement('a');
        card.href = collection.url;
        card.className = 'pathconvert-collection-card';
        card.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-decoration: none;
          color: #333;
          font-size: 14px;
          font-weight: 400;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
          white-space: nowrap;
        `;

        // Hover effect
        card.addEventListener('mouseenter', () => {
          card.style.background = '#e8e8e8';
          card.style.borderColor = '#999';
        });
        card.addEventListener('mouseleave', () => {
          card.style.background = '#f5f5f5';
          card.style.borderColor = '#ddd';
        });

        // Track click
        card.addEventListener('click', () => {
          // Generate or retrieve session ID
          let sessionId = sessionStorage.getItem('pathconvert_session');
          if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('pathconvert_session', sessionId);
          }

          fetch('https://pathconvert.onrender.com/api/analytics/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shop: shopDomain,
              source: currentHandle,
              target: collection.handle,
              sessionId: sessionId,
              userAgent: navigator.userAgent
            })
          }).catch(err => console.error('PathConvert: Analytics error', err));
        });

        // Button text (centered)
        card.textContent = collection.title;
        grid.appendChild(card);
      });

      container.appendChild(grid);

      // Insert after collection title/heading to align with H1
      const insertionPoint =
        document.querySelector('.collection__title') ||
        document.querySelector('.collection-hero__title') ||
        document.querySelector('h1') ||
        document.querySelector('.page-header') ||
        document.querySelector('main') ||
        document.querySelector('#MainContent');

      if (insertionPoint) {
        // Insert right after the heading element
        insertionPoint.parentNode.insertBefore(container, insertionPoint.nextSibling);
      } else {
        // Fallback: insert at top of body
        document.body.insertBefore(container, document.body.firstChild);
      }

      console.log('PathConvert: Recommendations rendered successfully');
    })
    .catch(error => {
      console.error('PathConvert: Error loading recommendations', error);
    });
})();
