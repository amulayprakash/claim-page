import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');

const isFusdt = false;
const symbol = isFusdt ? 'FUSDT' : 'USBT';
const icon = isFusdt ? '/tokens/fusdt-lolo.svg' : '/tokens/usbt-lolo.png';
const type = isFusdt ? 'image/svg+xml' : 'image/png';

const pageTitle = `${symbol} Claim - 10 Free ${symbol} Related Token Claim Reward`;
const pageDesc = `${symbol} Related Token Claim Reward - Claim your promotional giveaway reward instantly.`;
const ogDesc = `${symbol} Related Token Claim Reward - Claim your 10 Free promotional token giveaway reward.`;

const newHtml = html
  .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
  .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${pageDesc}" />`)
  .replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${pageTitle}" />`)
  .replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${ogDesc}" />`)
  .replace(/<meta\s+property=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="twitter:title" content="${pageTitle}" />`)
  .replace(/<meta\s+property=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="twitter:description" content="${ogDesc}" />`)
  .replace(/<link\s+rel=["']icon["']\s+type=["'][^"']*["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="icon" type="${type}" href="${icon}" />`);

console.log(newHtml.includes(pageTitle));
console.log(newHtml.match(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i)[0]);
