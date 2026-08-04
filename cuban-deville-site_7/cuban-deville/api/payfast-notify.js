// /api/payfast-notify.js
// PayFast's servers POST here after a payment completes (the "ITN" — Instant
// Transaction Notification). This is separate from return_url: return_url is
// where the customer's browser lands, this is a server-to-server call PayFast
// makes directly, and it's the only notification you should actually trust.

const crypto = require('crypto');

function pfEncode(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const data = req.body || {};

  // 1. Verify the signature so we know this actually came from PayFast
  //    and wasn't tampered with in transit.
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  let paramString = Object.entries(data)
    .filter(([k]) => k !== 'signature')
    .map(([k, v]) => `${k}=${pfEncode(String(v))}`)
    .join('&');
  if (passphrase) paramString += `&passphrase=${pfEncode(passphrase)}`;
  const expectedSig = crypto.createHash('md5').update(paramString).digest('hex');

  if (expectedSig !== data.signature) {
    console.error('PayFast ITN: signature mismatch', data);
    res.status(400).send('Invalid signature');
    return;
  }

  // 2. Only act on completed payments.
  if (data.payment_status !== 'COMPLETE') {
    res.status(200).send('OK');
    return;
  }

  // 3. This is the point to actually fulfil the order:
  //    - email the customer their preset download / confirm the feature request
  //    - mark the order as paid somewhere durable (a database, Airtable, Google Sheet —
  //      Vercel functions don't persist anything between calls, so nothing is
  //      "remembered" unless you write it somewhere external)
  //    Order reference: data.custom_str1 (matches the m_payment_id from checkout.js)
  //    Amount paid: data.amount_gross
  //
  // Example (commented out — needs an email provider like Resend or SendGrid,
  // and its API key added as another Vercel environment variable):
  //
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     from: 'orders@cubandeville.com',
  //     to: data.email_address,
  //     subject: 'Your Cuban DeVille order',
  //     html: `Thanks for your order (${data.custom_str1}). Here's your download link…`,
  //   }),
  // });

  console.log('PayFast payment completed:', data.custom_str1, data.amount_gross);

  const webhookUrl = process.env.ORDER_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ref: data.custom_str1,
          amount: data.amount_gross,
          buyer_email: data.email_address,
          item_description: data.item_description,
          source: 'cubandeville.com order',
        }),
      });
    } catch (err) {
      console.error('Order webhook failed:', err);
    }
  }

  res.status(200).send('OK');
};
