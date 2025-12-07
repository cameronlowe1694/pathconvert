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
        margin: 40px auto;
        padding: 30px 20px;
        max-width: 1200px;
        background: #f9f9f9;
        border-radius: 8px;
      `;

      // Add heading
      const heading = document.createElement('h3');
      heading.textContent = 'You might also like';
      heading.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 24px;
        font-weight: 600;
        text-align: center;
        color: #333;
      `;
      container.appendChild(heading);

      // Create grid for recommendation buttons
      const grid = document.createElement('div');
      grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
      `;

      // Add each recommendation as a button/card
      data.related.forEach(collection => {
        const card = document.createElement('a');
        card.href = collection.url;
        card.className = 'pathconvert-collection-card';
        card.style.cssText = `
          display: block;
          padding: 20px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          text-decoration: none;
          color: #333;
          transition: all 0.2s ease;
          cursor: pointer;
        `;

        // Hover effect
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-2px)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = 'none';
        });

        // Track click
        card.addEventListener('click', () => {
          fetch('https://pathconvert.onrender.com/api/analytics/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shop: shopDomain,
              source: currentHandle,
              target: collection.handle
            })
          }).catch(err => console.error('PathConvert: Analytics error', err));
        });

        // Card content
        const title = document.createElement('div');
        title.textContent = collection.title;
        title.style.cssText = `
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
        `;

        const similarity = document.createElement('div');
        similarity.textContent = `${Math.round(collection.similarity_score * 100)}% match`;
        similarity.style.cssText = `
          font-size: 12px;
          color: #008060;
          font-weight: 600;
        `;

        card.appendChild(title);
        card.appendChild(similarity);
        grid.appendChild(card);
      });

      container.appendChild(grid);

      // Insert after collection description or at the top of main content
      const insertionPoint =
        document.querySelector('.collection-description') ||
        document.querySelector('.collection-hero') ||
        document.querySelector('main') ||
        document.querySelector('#MainContent') ||
        document.body;

      if (insertionPoint.tagName === 'MAIN' || insertionPoint.id === 'MainContent') {
        insertionPoint.insertBefore(container, insertionPoint.firstChild);
      } else {
        insertionPoint.parentNode.insertBefore(container, insertionPoint.nextSibling);
      }

      console.log('PathConvert: Recommendations rendered successfully');
    })
    .catch(error => {
      console.error('PathConvert: Error loading recommendations', error);
    });
})();
