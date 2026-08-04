// /api/vault-request.js
// Optional future World Key endpoint. It creates an 8-character code that is
// valid for the current UTC day and sends it to VAULT_WEBHOOK_URL.

const crypto = require('crypto');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bodyObject(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (_) { return {}; }
}

function dayBucket(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function createCode(email, secret, bucket = dayBucket()) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${email}|${bucket}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = bodyObject(req);
  const email = String(body.email || '').trim().toLowerCase();
  const honeypot = String(body.company || '').trim();
  if (honeypot) return res.status(200).json({ ok: true });
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  const secret = process.env.VAULT_SECRET;
  if (!secret || secret.length < 24) {
    return res.status(503).json({ ok: false, error: 'Vault access is not configured.' });
  }

  const code = createCode(email, secret);
  const payload = {
    email,
    code,
    expires: 'End of the next UTC day',
    source: 'Cuban DeVille World Key',
    timestamp: new Date().toISOString()
  };

  const webhookUrl = process.env.VAULT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.VAULT_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.VAULT_WEBHOOK_TOKEN}`;
      const response = await fetch(webhookUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    } catch (error) {
      console.error('Vault webhook failed:', error instanceof Error ? error.message : error);
      return res.status(502).json({ ok: false, error: 'Access email could not be sent.' });
    }
  } else {
    console.log('Vault access code:', JSON.stringify(payload));
  }

  return res.status(200).json({ ok: true });
};
