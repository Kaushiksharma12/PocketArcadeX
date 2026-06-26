const fs = require('fs');
const path = require('path');

// Update Service Worker Cache Version
const swPath = path.join(__dirname, '../public/sw.js');
try {
  let swContent = fs.readFileSync(swPath, 'utf8');

  const buildId = Date.now().toString();
  const updatedContent = swContent.replace(
    /const CACHE_NAME = 'pocket-arcade-x-cache-[^']+';/,
    `const CACHE_NAME = 'pocket-arcade-x-cache-${buildId}';`
  );

  fs.writeFileSync(swPath, updatedContent, 'utf8');
  console.log(`[PWA] Updated sw.js CACHE_NAME to: pocket-arcade-x-cache-${buildId}`);
} catch (error) {
  console.error('[PWA] Failed to update service worker version:', error);
}

// Copy Apple Touch Icon
const srcIcon = path.join(__dirname, '../public/icon-192.png');
const destIcon = path.join(__dirname, '../public/icon-180.png');
try {
  fs.copyFileSync(srcIcon, destIcon);
  console.log('[PWA] Created apple-touch-icon at: public/icon-180.png');
} catch (error) {
  console.error('[PWA] Failed to create apple-touch-icon:', error);
}
