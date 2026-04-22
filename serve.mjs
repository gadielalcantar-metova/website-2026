import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff' };
const ROOT = decodeURIComponent(new URL('.', import.meta.url).pathname);

createServer(async (req, res) => {
  let url = decodeURIComponent(req.url);
  if (url === '/') url = '/index.html';
  else if (url === '/second-hero') url = '/second-hero.html';
  else if (url === '/services') url = '/services.html';
  else if (url === '/services/ux-ui-design') url = '/services/ux-ui-design.html';
  else if (url === '/services/ai-product-development') url = '/services/ai-product-development.html';
  else if (url === '/services/custom-software-engineering') url = '/services/custom-software-engineering.html';
  else if (url === '/services/digital-consulting-strategy') url = '/services/digital-consulting-strategy.html';
  else if (url === '/services/nearshore-talent-solutions') url = '/services/nearshore-talent-solutions.html';
  else if (url === '/services/iot-emerging-tech') url = '/services/iot-emerging-tech.html';
  else if (url === '/work') url = '/work.html';
  else if (url === '/work/fiton') url = '/work/fiton.html';
  else if (url === '/work/mybambu') url = '/work/mybambu.html';
  else if (url === '/work/tnaa') url = '/work/tnaa.html';
  else if (url === '/work/barwis') url = '/work/barwis.html';
  else if (url === '/work/acoustic') url = '/work/acoustic.html';
  else if (url === '/work/setf') url = '/work/setf.html';
  else if (url === '/about') url = '/about.html';
  else if (url === '/contact') url = '/contact.html';
  else if (url === '/insights') url = '/insights.html';
  else if (url === '/ai/llm-nlp-integration') url = '/ai/llm-nlp-integration.html';
  else if (url === '/ai/computer-vision-ml') url = '/ai/computer-vision-ml.html';
  else if (url === '/ai/ai-powered-saas') url = '/ai/ai-powered-saas.html';
  let path = join(ROOT, url);
  try {
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}).listen(3000, () => console.log('Serving at http://localhost:3000'));
