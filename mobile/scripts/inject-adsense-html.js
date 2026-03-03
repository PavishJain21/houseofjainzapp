#!/usr/bin/env node
/**
 * Injects Google AdSense meta tag and script into dist/index.html after expo export.
 * Run after: npm run build:web (or use build:web:full)
 */
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const metaTag = '<meta name="google-adsense-account" content="ca-pub-7344910238595105">';
const scriptTag = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7344910238595105" crossorigin="anonymous"></script>';

if (!fs.existsSync(distIndex)) {
  console.warn('inject-adsense-html: dist/index.html not found, skipping.');
  process.exit(0);
}

let html = fs.readFileSync(distIndex, 'utf8');

// Remove any existing AdSense tags so we control placement (avoid duplicates)
html = html.replace(/\s*<meta name="google-adsense-account" content="ca-pub-7344910238595105">\s*/g, '');
html = html.replace(/\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7344910238595105" crossorigin="anonymous"><\/script>\s*/g, '');

if (!html.includes('google-adsense-account')) {
  // Insert at the very start of <head> so crawlers see it in the first bytes (required for AdSense verification)
  html = html.replace(
    /<head>/,
    `<head>\n  <!-- Google AdSense (verification + ad code) -->\n  ${metaTag}\n  ${scriptTag}`
  );
  fs.writeFileSync(distIndex, html);
  console.log('inject-adsense-html: Added Google AdSense meta and script to dist/index.html (at top of <head>)');
} else {
  console.log('inject-adsense-html: AdSense already at top of dist/index.html');
}
