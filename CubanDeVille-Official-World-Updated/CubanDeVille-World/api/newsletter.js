// /api/newsletter.js
// Receives Vault / mailing-list signups from the website.
//
// Recommended production setup:
//   1. Create a webhook in Make, Zapier, Mailchimp, Brevo, ConvertKit, etc.
//   2. Add NEWSLETTER_WEBHOOK_URL in Vercel -> Project -> Settings -> Environment Variables.
//   3. Optionally add NEWSLETTER_WEBHOOK_TOKEN and validate it in your automation.
//
// Without a webhook the signup is written to Vercel function logs as a fallback.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bodyObject(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (_) { return {}; }
}

async function postWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  const source = String(body.source || 'cubandeville.com').trim().slice(0, 120);
  const honeypot = String(body.company || '').trim();

  // Quietly accept bot submissions so the honeypot is not revealed.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  const payload = {
    email,
    source,
    consent: body.consent === true,
    timestamp: new Date().toISOString(),
    website: 'https://cubandeville.com/'
  };

  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;
  let delivery = 'logged';

  if (webhookUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.NEWSLETTER_WEBHOOK_TOKEN) {
        headers.Authorization = `Bearer ${process.env.NEWSLETTER_WEBHOOK_TOKEN}`;
      }

      const response = await postWithTimeout(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
      delivery = 'webhook';
    } catch (error) {
      console.error('Newsletter webhook failed:', error instanceof Error ? error.message : error);
    }
  }

  // Backup log. Vercel logs should not be treated as a permanent mailing list.
  console.log('Cuban DeVille signup:', JSON.stringify(payload));
  return res.status(200).json({ ok: true, delivery });
};
