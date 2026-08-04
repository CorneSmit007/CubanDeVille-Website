// /api/checkout.js
// Vercel serverless function — builds a signed PayFast payment request.
//
// Prices are looked up server-side (never trust a price sent from the browser —
// otherwise anyone could open dev tools and buy a $100 feature for $1).
// Amounts are in ZAR because PayFast settles in South African Rand regardless
// of what currency a visitor sees displayed on the site.

const crypto = require('crypto');

const PRICES_ZAR = {
  'Commission a Feature — Hook': 1599.99,
  'Commission a Feature — Verse': 999.99,
  'DeVille Vocal Preset': 1299,
  'DeVille Full Vocal Chain': 1699,
  'Mic Noise Filter Eyeball': 999.99,
};

function pfEncode(str) {
  // PayFast expects application/x-www-form-urlencoded with spaces as '+'
  return encodeURIComponent(str).replace(/%20/g, '+');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  let cart;
  try {
    cart = JSON.parse(req.body.cart || '[]');
  } catch (e) {
    res.status(400).send('Invalid cart data.');
    return;
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    res.status(400).send('Cart is empty.');
    return;
  }

  let total = 0;
  const lines = [];
  for (const item of cart) {
    const unitPrice = PRICES_ZAR[item.name];
    if (unitPrice === undefined) {
      res.status(400).send('Unknown product: ' + item.name);
      return;
    }
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    total += unitPrice * qty;
    lines.push(`${item.name} x${qty}`);
  }

  if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
    res.status(500).send(
      'PayFast is not configured yet. Set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY ' +
      'in your Vercel project environment variables, then redeploy.'
    );
    return;
  }

  const isSandbox = process.env.PAYFAST_MODE !== 'live';
  const processUrl = isSandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const paymentId = 'CDV-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  const fields = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${siteUrl}/thank-you.html`,
    cancel_url: `${siteUrl}/`,
    notify_url: `${siteUrl}/api/payfast-notify`,
    m_payment_id: paymentId,
    amount: total.toFixed(2),
    item_name: 'Cuban DeVille Order',
    item_description: lines.join(', ').slice(0, 255),
    custom_str1: paymentId,
  };

  let paramString = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${pfEncode(String(v))}`)
    .join('&');

  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (passphrase) {
    paramString += `&passphrase=${pfEncode(passphrase)}`;
  }

  const signature = crypto.createHash('md5').update(paramString).digest('hex');

  const formFields = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`)
    .join('\n    ');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Redirecting to secure checkout…</title></head>
<body style="background:#0A0A0A;color:#F7F7F5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Redirecting to secure checkout…</p>
  <form id="pf" action="${processUrl}" method="post">
    ${formFields}
    <input type="hidden" name="signature" value="${signature}">
  </form>
  <script>document.getElementById('pf').submit();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
