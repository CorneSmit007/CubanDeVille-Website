// /api/vault-verify.js
// Verifies a code by recomputing it the same way vault-request.js generated
// it — same email + same VAULT_SECRET always produces the same code, so
// there's nothing to look up in a database.

const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const email = (req.body && req.body.email || '').trim().toLowerCase();
  const submittedCode = (req.body && req.body.code || '').trim().toUpperCase();

  const secret = process.env.VAULT_SECRET;
  if (!secret || !email || !submittedCode) {
    res.status(200).json({ ok: false });
    return;
  }

  const expectedCode = crypto.createHmac('sha256', secret).update(email).digest('hex').slice(0, 8).toUpperCase();

  const ok = crypto.timingSafeEqual(Buffer.from(submittedCode.padEnd(8)), Buffer.from(expectedCode.padEnd(8)))
    && submittedCode === expectedCode;

  res.status(200).json({ ok });
};
