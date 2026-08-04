// /api/newsletter.js
// Accepts a newsletter signup and forwards it somewhere real.
//
// This does NOT connect to an email platform on its own — you still need to
// point NEWSLETTER_WEBHOOK_URL (a Vercel environment variable) at something
// that receives it. The easiest no-code options:
//   - A Zapier or Make.com "Catch Webhook" step that adds the email to
//     Mailchimp / ConvertKit / a Google Sheet
//   - A webhook URL from your email platform directly, if it offers one
//
// Until NEWSLETTER_WEBHOOK_URL is set, signups are only visible in your
// Vercel function logs (Vercel dashboard → your project → Logs) — they are
// NOT silently lost, but they also aren't going anywhere useful yet.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const email = (req.body && req.body.email || '').trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail) {
    res.status(400).json({ ok: false, error: 'Invalid email' });
    return;
  }

  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'cubandeville.com newsletter', timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('Newsletter webhook failed:', err);
      // Still log it below so the signup isn't lost even if the webhook is down.
    }
  }

  console.log('Newsletter signup:', email);

  res.status(200).json({ ok: true });
};
