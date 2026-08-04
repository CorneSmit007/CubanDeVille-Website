CART integration notes

Files added:
- cuban-deville/cart.js       — client-side cart, localStorage-backed
- server/create-checkout-stripe.js — example Node/Express server to create Stripe Checkout Sessions

How to enable on the site
1) Commit already added cart.js to cuban-deville/cart.js (this repo). To load it from the page, edit cuban-deville/index.html and add the following just before the closing </body> tag:

   <script src="cart.js"></script>

   (If you place cart.js in a different folder, adjust the path accordingly.)

2) Server: choose a payment provider and deploy a small server that implements /create-checkout. The example added uses Stripe and expects an environment variable STRIPE_SECRET_KEY. Install dependencies and run the example server:

   npm install express stripe
   STRIPE_SECRET_KEY=sk_test_... node server/create-checkout-stripe.js

   Set SUCCESS_URL and CANCEL_URL env vars if you want custom redirects.

3) PayFast: if you prefer PayFast (the site mentions it), implement /create-checkout to build the signed PayFast parameters server-side and redirect the user to PayFast. Do NOT put merchant_key or passphrase in client code. The server must verify IPN notifications. See PayFast docs for exact signing and IPN verification.

4) Security & validation
- Always validate cart server-side and re-compute totals using the stored product prices (don’t trust client-submitted prices).
- Create an internal order id before redirecting to the gateway and mark it pending. Update it when you receive webhooks/IPN.

Testing locally
- Stripe: use test keys and the example server above.
- PayFast: use sandbox/test merchant settings and verify IPN flow.

If you want, I can also:
- Update index.html in this repo to include the <script src="cart.js"></script> automatically (I can do that in a follow-up commit), or
- Implement a PayFast server example instead of Stripe.

