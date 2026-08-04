# Cuban DeVille — Official World

A production-ready, responsive artist hub for **cubandeville.com**. The site is deliberately framework-free so the entire folder can be committed directly to GitHub and deployed on Vercel without a build step.

## What is included

- Immersive procedural 3D-style world with an animated star field, orbiting emblem and pointer/touch-safe interactions.
- Premium desktop and mobile layouts, including a mobile navigation dock.
- Official music, video and social links in a cinematic “portal” interface.
- Current music section featuring **BRAZIL** and recent 2026 releases.
- Vault / inner-circle email capture.
- Story, Cloud Insure link and bookings section.
- SEO metadata, social sharing image, structured data, sitemap and robots file.
- Branded 404, privacy and terms pages.
- Vercel security and asset-caching headers.
- Reduced-motion, keyboard, focus and screen-reader support.

## Deploy to GitHub and Vercel

1. Unzip the pack.
2. Upload **the contents of this folder** to the root of your GitHub repository. `index.html` must be visible at the top level of the repository.
3. In Vercel, import or reconnect that repository.
4. Use these settings:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** leave empty
   - **Output Directory:** leave empty
5. Deploy.

No `npm install`, build command or `node_modules` folder is required.

## Make the Vault form store subscribers

The form posts to `/api/newsletter.js`. Add this environment variable in **Vercel → Project → Settings → Environment Variables**:

- `NEWSLETTER_WEBHOOK_URL` — a webhook from Make, Zapier, Mailchimp, Brevo, ConvertKit or another mailing tool.

Optional:

- `NEWSLETTER_WEBHOOK_TOKEN` — sent as a Bearer token to your webhook.

Until a webhook is connected, valid signups are written to Vercel function logs as a fallback. Logs are not a permanent mailing list, so connect a webhook before promoting the Vault publicly.

## Optional future access-code Vault

The included `api/vault-request.js` and `api/vault-verify.js` endpoints are ready for a later password-code flow. The current public interface intentionally uses a cleaner invite request instead of showing empty or fake private tracks.

Environment variables for the optional code flow:

- `VAULT_SECRET` — a long random secret, at least 24 characters.
- `VAULT_WEBHOOK_URL` — automation endpoint that emails the generated code.
- `VAULT_WEBHOOK_TOKEN` — optional Bearer token.

## Important files

- `index.html` — all page content and official links.
- `assets/css/styles.css` — the full visual system and responsive design.
- `assets/js/app.js` — navigation, modal, forms, reveals, tilt and interaction logic.
- `assets/js/world.js` — dependency-free animated star-world canvas.
- `assets/images/` — transparent logo variants, icons and social cover.
- `api/newsletter.js` — Vault signup endpoint.
- `vercel.json` — headers and caching.

## Updating links or release information

Search `index.html` for the platform name or release title. All links are ordinary HTML and can be edited without touching the JavaScript.

Current official links included:

- Spotify
- Apple Music
- YouTube
- Instagram
- TikTok
- SoundCloud
- X
- Cloud Insure
- `bookings@cubandeville.com`

## Performance notes

- The 3D effect is built with CSS and a lightweight canvas rather than a large 3D framework.
- Star density automatically reduces on mobile devices and when Data Saver is enabled.
- Motion is disabled for visitors who prefer reduced motion.
- No analytics or advertising scripts are included.
- External social and music embeds are not loaded in the background.

## Legal review

The privacy and terms pages are substantially improved and written for the South African context, but they should still be reviewed by a qualified legal professional before they are treated as final legal documents.
