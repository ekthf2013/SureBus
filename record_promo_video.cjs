const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright-core');

const ROOT_DIR = __dirname;
const OUTPUT_DIR = path.join(__dirname, 'videos');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Static File Server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '/promo') reqPath = '/promo_video.html';

  let filePath = path.join(ROOT_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, 'public', reqPath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function run() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const PORT = server.address().port;
  console.log(`Promo server started at http://127.0.0.1:${PORT}/promo_video.html`);

  console.log('Launching Chrome for 1080p Full HD recording (Retina 2x Crisp)...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--hide-scrollbars',
      '--disable-gpu-vsync',
      '--font-render-hinting=max',
      '--enable-font-antialiasing',
      '--high-dpi-support=1',
      '--force-device-scale-factor=2'
    ]
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('Navigating to promo video page...');
  await page.goto(`http://127.0.0.1:${PORT}/promo_video.html`);

  console.log('Recording motion graphic promo video (approx 38 seconds)...');

  // Monitor progress
  const startTime = Date.now();
  while (true) {
    await page.waitForTimeout(1500);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const finished = await page.evaluate(() => window.__promoVideoFinished);
    console.log(`[Recording] Elapsed: ${elapsed}s / 38s`);
    if (finished || elapsed >= 39) {
      break;
    }
  }

  console.log('Recording finished. Finalizing video...');
  await page.waitForTimeout(1000);

  // Close context to finish writing WebM file
  await context.close();
  await browser.close();
  server.close();

  // Find latest recorded webm file
  const videoFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.webm') && f.startsWith('page@'))
    .map(f => ({ name: f, time: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (videoFiles.length > 0) {
    const rawWebm = path.join(OUTPUT_DIR, videoFiles[0].name);
    const finalWebm = path.join(OUTPUT_DIR, 'SureBus_Official_Promo_1080p.webm');
    fs.copyFileSync(rawWebm, finalWebm);
    const sizeMb = (fs.statSync(finalWebm).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Saved Full HD Promo Video: ${finalWebm} (${sizeMb} MB)`);
  }

  console.log('🎬 All completed successfully!');
}

run().catch(console.error);

