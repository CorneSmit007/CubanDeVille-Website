// /api/vault-request.js
// Generates a real access code for a given email — no database required.
// The code is a signed digest of the email + a secret only your server knows
// (VAULT_SECRET, set in Vercel's environment variables), so:
//   - it's never hard-coded or visible in the page source
//   - it's the same code every time for a given email (deterministic), so
//     there's nothing to store — vault-verify.js just recomputes it
//   - anyone without VAULT_SECRET cannot generate a valid code themselves
//
// What this does NOT do yet: actually email the code to the visitor. It
// forwards to VAULT_WEBHOOK_URL if you've set one (e.g. a Zapier step that
// emails it via your ESP), and always logs it to your Vercel function logs
// as a fallback so nothing is silently lost while that's not connected.

const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const email = (req.body && req.body.email || '').trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail) {
    res.status(400).json({ ok: false, error: 'Invalid email' });
    return;
  }

  const secret = process.env.VAULT_SECRET;
  if (!secret) {
    res.status(500).json({ ok: false, error: 'Vault is not configured yet (missing VAULT_SECRET).' });
    return;
  }

  const code = crypto.createHmac('sha256', secret).update(email).digest('hex').slice(0, 8).toUpperCase();

  const webhookUrl = process.env.VAULT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, source: 'cubandeville.com vault' }),
      });
    } catch (err) {
      console.error('Vault webhook failed:', err);
    }
  }

  // Fallback so the code is retrievable even before an email step is wired up.
  console.log('Vault access code for', email, '→', code);

  res.status(200).json({ ok: true });
};
