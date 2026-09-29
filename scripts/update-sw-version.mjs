import fs from 'fs';
import path from 'path';

// Update Service Worker Cache Version
// import.meta.dirname is available in Node 20.11+
const swPath = path.join(import.meta.dirname, '../public/sw.js');
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
const srcIcon = path.join(import.meta.dirname, '../public/icon-192.png');
const destIcon = path.join(import.meta.dirname, '../public/icon-180.png');
try {
  fs.copyFileSync(srcIcon, destIcon);
  console.log('[PWA] Created apple-touch-icon at: public/icon-180.png');
} catch (error) {
  console.error('[PWA] Failed to create apple-touch-icon:', error);
}
