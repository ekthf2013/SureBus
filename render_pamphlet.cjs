const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT_DIR = __dirname;
const PAMPHLET_DIR = path.join(__dirname, 'pamphlet');
if (!fs.existsSync(PAMPHLET_DIR)) {
  fs.mkdirSync(PAMPHLET_DIR, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '/pamphlet') reqPath = '/pamphlet.html';

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
  const port = server.address().port;
  console.log(`Server started on http://127.0.0.1:${port}`);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 2,
  });

  console.log('Loading pamphlet.html...');
  await page.goto(`http://127.0.0.1:${port}/pamphlet.html`);
  await page.waitForTimeout(1500);

  // 1. High-Resolution Screenshot for Single A4 Page (2x Retina)
  const a4Page = await page.locator('.a4-page').first();
  if (a4Page) {
    const pngPath = path.join(PAMPHLET_DIR, 'SureBus_Pamphlet_A4.png');
    await a4Page.screenshot({ path: pngPath });
    console.log(`✅ Saved High-Res Single A4 Image: ${pngPath}`);

    // Copy to artifact directory for instant viewing in chat
    const artifactDir = 'C:\\Users\\suresoft\\.gemini\\antigravity\\brain\\64aadb77-4b59-45f8-b064-e3a4beef35df';
    if (fs.existsSync(artifactDir)) {
      const destArtifact = path.join(artifactDir, 'SureBus_Pamphlet_A4.png');
      fs.copyFileSync(pngPath, destArtifact);
      console.log(`✅ Copied to Artifact Dir: ${destArtifact}`);
    }
  }

  // 2. Generate Single-Page Print-Ready A4 PDF
  const pdfPath = path.join(PAMPHLET_DIR, 'SureBus_Brochure_A4.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    pageRanges: '1',
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  console.log(`✅ Saved Single-Page Print-Ready A4 PDF: ${pdfPath}`);

  await browser.close();
  server.close();
  console.log('🎉 All pamphlet deliverables generated successfully!');
}

run().catch(console.error);

