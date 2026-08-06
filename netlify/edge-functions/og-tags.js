export default async (request, context) => {
  const url = new URL(request.url);
  
  // Try to skip non-HTML requests early based on URL extension
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|txt|map)$/i)) {
    return;
  }

  const host = url.hostname.toLowerCase();
  const isFusdt = host.includes('fusdt');
  const symbol = isFusdt ? 'FUSDT' : 'USBT';
  const icon = isFusdt ? '/tokens/fusdt-lolo.svg' : '/tokens/usbt-lolo.png';
  const type = isFusdt ? 'image/svg+xml' : 'image/png';
  const ogImage = isFusdt ? '/tokens/fusdt-logo.png' : '/tokens/usbt-lolo.png';
  
  const pageTitle = `${symbol} Claim - 10 Free ${symbol} Related Token Claim Reward`;
  const pageDesc = `${symbol} Related Token Claim Reward - Claim your promotional giveaway reward instantly.`;
  const ogDesc = `${symbol} Related Token Claim Reward - Claim your 10 Free promotional token giveaway reward.`;

  // Get the response from the next handler (the static file or redirect)
  const response = await context.next();
  
  // Make sure we only modify HTML responses
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  const text = await response.text();
  
  // Replace the static metadata with the dynamic ones
  const newHtml = text
    .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${pageDesc}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${pageTitle}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${ogDesc}" />`)
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`)
    .replace(/<meta\s+property="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:title" content="${pageTitle}" />`)
    .replace(/<meta\s+property="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:description" content="${ogDesc}" />`)
    .replace(/<meta\s+property="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:image" content="${ogImage}" />`)
    .replace(/<link\s+rel="icon"\s+type="[^"]*"\s+href="[^"]*"\s*\/?>/i, `<link rel="icon" type="${type}" href="${icon}" />`);

  return new Response(newHtml, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};
