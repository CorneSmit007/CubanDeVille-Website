// /api/vault-verify.js
// Verifies a World Key generated for today or the previous UTC day.

const crypto = require('crypto');

function bodyObject(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (_) { return {}; }
}

function dayBucket(date) {
  return date.toISOString().slice(0, 10);
}

function createCode(email, secret, bucket) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${email}|${bucket}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

function safeEqual(a, b) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
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
  const submitted = String(body.code || '').trim().toUpperCase();
  const secret = process.env.VAULT_SECRET;

  if (!secret || !email || !/^[A-F0-9]{8}$/.test(submitted)) {
    return res.status(200).json({ ok: false });
  }

  const today = new Date();
  const previous = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const validCodes = [
    createCode(email, secret, dayBucket(today)),
    createCode(email, secret, dayBucket(previous))
  ];

  const ok = validCodes.some((code) => safeEqual(submitted, code));
  return res.status(200).json({ ok });
};
