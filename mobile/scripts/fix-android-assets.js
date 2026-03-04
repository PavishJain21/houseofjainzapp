/**
 * Re-encodes PNG assets so they are compatible with Android AAPT.
 * Fixes "AAPT: error: file failed to compile" caused by Apple CgBI chunks
 * or other non-standard PNG metadata that Android's build tools reject.
 */
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets');
const logoPath = path.join(assetsDir, 'logo.png');

if (!fs.existsSync(logoPath)) {
  console.warn('No logo.png found at', logoPath);
  process.exit(0);
}

async function fixAssets() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Run: npm install --save-dev sharp');
    process.exit(1);
  }

  const outPath = path.join(assetsDir, 'logo.png');
  const tempPath = path.join(assetsDir, 'logo.android-fix.png');

  try {
    await sharp(logoPath)
      .png({ compressionLevel: 6, adaptiveFiltering: false })
      .toFile(tempPath);
    fs.renameSync(tempPath, outPath);
    console.log('Re-encoded assets/logo.png for Android AAPT compatibility.');
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error('Failed to re-encode logo:', err.message);
    process.exit(1);
  }
}

fixAssets();
