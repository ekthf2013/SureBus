const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT_DIR = __dirname;
const MASCOT_DIR = path.join(__dirname, 'public', 'images', 'mascot');

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  let filePath = path.join(ROOT_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, 'public', reqPath);
  }
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200);
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});

async function run() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 2,
  });

  // Base64 encode the mascot image
  const mascotBuf = fs.readFileSync(path.join(MASCOT_DIR, 'surebus_driver_mascot.jpg'));
  const mascotBase64 = `data:image/jpeg;base64,${mascotBuf.toString('base64')}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'DungGeunMo';
      src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/DungGeunMo.woff') format('woff');
      font-weight: normal;
      font-style: normal;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1024px;
      height: 1024px;
      position: relative;
      background: #ffffff;
      overflow: hidden;
    }
    .mascot-base {
      position: absolute;
      width: 1024px;
      height: 1024px;
      top: 0;
      left: 0;
      object-fit: cover;
    }

    /* SVG Speech Bubble Overlay */
    .speech-svg-wrap {
      position: absolute;
      top: 25px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      width: 540px;
      height: 270px;
      filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
    }
  </style>
</head>
<body>
  <img src="${mascotBase64}" class="mascot-base" />

  <div class="speech-svg-wrap">
    <svg width="540" height="270" viewBox="0 0 540 270" fill="none" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated; shape-rendering: crispEdges;">
      <!-- White Background Body (Pixel cut corners) -->
      <path d="
        M 30,10 H 510 
        V 20 H 520 
        V 30 H 530 
        V 190 H 520 
        V 200 H 510 
        V 210 H 280 
        L 260,240 
        L 240,260 
        L 230,260 
        L 230,230 
        L 240,210 
        H 30 
        V 200 H 20 
        V 190 H 10 
        V 30 H 20 
        V 20 H 30 
        Z
      " fill="#ffffff" />

      <!-- Outer Black Pixel Border (Faithful stepped pixel outline) -->
      <!-- Top edge -->
      <rect x="30" y="0" width="480" height="10" fill="#000000" />
      <!-- Top-right corner steps -->
      <rect x="510" y="10" width="10" height="10" fill="#000000" />
      <rect x="520" y="20" width="10" height="10" fill="#000000" />
      <rect x="530" y="30" width="10" height="160" fill="#000000" />
      <!-- Bottom-right corner steps -->
      <rect x="520" y="190" width="10" height="10" fill="#000000" />
      <rect x="510" y="200" width="10" height="10" fill="#000000" />
      <!-- Bottom edge right part -->
      <rect x="280" y="210" width="230" height="10" fill="#000000" />
      
      <!-- Stepped Pixel Tail pointing to penguin's hat -->
      <rect x="270" y="220" width="10" height="10" fill="#000000" />
      <rect x="260" y="230" width="10" height="10" fill="#000000" />
      <rect x="250" y="240" width="10" height="10" fill="#000000" />
      <rect x="240" y="250" width="10" height="10" fill="#000000" />
      <rect x="230" y="260" width="10" height="10" fill="#000000" />
      <!-- Left border of tail -->
      <rect x="220" y="250" width="10" height="10" fill="#000000" />
      <rect x="220" y="240" width="10" height="10" fill="#000000" />
      <rect x="230" y="230" width="10" height="10" fill="#000000" />
      <rect x="230" y="220" width="10" height="10" fill="#000000" />

      <!-- Bottom edge left part -->
      <rect x="30" y="210" width="200" height="10" fill="#000000" />
      <!-- Bottom-left corner steps -->
      <rect x="20" y="200" width="10" height="10" fill="#000000" />
      <rect x="10" y="190" width="10" height="10" fill="#000000" />
      <rect x="0" y="30" width="10" height="160" fill="#000000" />
      <!-- Top-left corner steps -->
      <rect x="10" y="20" width="10" height="10" fill="#000000" />
      <rect x="20" y="10" width="10" height="10" fill="#000000" />

      <!-- Pixel Art Hangul Text "슈어버스" -->
      <text x="270" y="125" font-family="DungGeunMo, monospace" font-size="88" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="#000000" letter-spacing="6">슈어버스</text>
    </svg>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outPng = path.join(MASCOT_DIR, 'surebus_driver_mascot_speech.png');
  await page.screenshot({ path: outPng });
  console.log(`✅ Saved Mascot with Speech Bubble: ${outPng}`);

  // Also copy to artifacts directory
  const artifactDir = 'C:\\Users\\suresoft\\.gemini\\antigravity\\brain\\64aadb77-4b59-45f8-b064-e3a4beef35df';
  if (fs.existsSync(artifactDir)) {
    const destArtifact = path.join(artifactDir, 'surebus_driver_mascot_speech.png');
    fs.copyFileSync(outPng, destArtifact);
    console.log(`✅ Copied to Artifact Dir: ${destArtifact}`);
  }

  await browser.close();
  server.close();
}

run().catch(console.error);
