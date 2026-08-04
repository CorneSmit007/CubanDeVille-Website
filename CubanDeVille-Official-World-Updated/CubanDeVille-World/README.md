# Cuban DeVille — Official World

A production-ready, responsive artist headquarters for **cubandeville.com**. The site is deliberately framework-free, so the full folder can be committed directly to GitHub and deployed on Vercel without a build step.

## What is included

- Immersive 3D-style world with a procedural star field, orbiting emblem and touch-safe interactions.
- Premium desktop and mobile layouts, including a mobile navigation dock.
- Music and social platform chooser menus instead of forced redirects.
- Live Spotify catalogue sync for the latest release, cover artwork, release date, recent releases and moving ticker.
- A curated static release fallback that remains visible whenever Spotify is not configured or temporarily unavailable.
- Vector play icons that render consistently on iPhone instead of becoming emoji.
- A WebKit/iPhone-safe emblem fallback that prevents the logo inside the globe from flickering.
- Vault / inner-circle email capture.
- Story, Cloud Insure link and bookings section.
- SEO metadata, social sharing image, structured data, sitemap and robots file.
- Branded 404, privacy and terms pages.
- Vercel security and caching headers.
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
5. Add the Spotify environment variables described below.
6. Deploy or redeploy.

No `npm install`, build command or `node_modules` folder is required.

## Activate automatic Spotify release updates

The browser calls `/api/releases`. That Vercel function securely requests Cuban DeVille's public albums and singles from Spotify, sorts them by release date and sends only public release information back to the website. Your Spotify secret never reaches the page source.

### One-time Spotify setup

1. Create an app in the Spotify for Developers dashboard. Spotify currently requires the owner of a new Development Mode app to have a Spotify Premium account.
2. Copy the app's **Client ID** and **Client Secret**.
3. Open **Vercel → Project → Settings → Environment Variables**.
4. Add:
   - `SPOTIFY_CLIENT_ID` — your Spotify app Client ID.
   - `SPOTIFY_CLIENT_SECRET` — your Spotify app Client Secret.
5. The following are already handled by defaults, but can be added explicitly:
   - `SPOTIFY_ARTIST_ID=6oTMQhViChy06Mf5vsYTk0`
   - `SPOTIFY_MARKET=ZA`
6. Redeploy the project so Vercel loads the new variables.

After setup, a new release will automatically replace the featured title, date, artwork, Spotify destination, recent-release buttons, music-modal title and scrolling release ticker after it becomes available in the Spotify artist catalogue. Responses are cached for approximately 15 minutes to keep the page fast and avoid unnecessary API requests.

Without these variables, the website remains fully functional and displays the curated **BRAZIL** fallback instead of showing an error.

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

- `index.html` — page content, fallbacks and official destinations.
- `assets/css/styles.css` — visual system, mobile fixes and responsive design.
- `assets/js/app.js` — navigation, chooser modals, live-release rendering, forms and interactions.
- `assets/js/world.js` — dependency-free animated star-world canvas.
- `assets/images/` — transparent logo variants, icons and social cover.
- `api/releases.js` — secure live Spotify catalogue endpoint.
- `api/newsletter.js` — Vault signup endpoint.
- `vercel.json` — security and caching headers.
- `.env.example` — environment-variable names without any private credentials.

## Updating destinations manually

All platform destinations are ordinary HTML links inside `index.html`. Search for the platform name to update a profile URL. The release feature normally updates from Spotify, while the hardcoded release information acts as the resilient fallback.

Current official destinations included:

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

- The 3D effect uses CSS and a lightweight canvas rather than a large 3D framework.
- Star density automatically reduces on mobile devices and when Data Saver is enabled.
- The iPhone version replaces the animated masked emblem with a stable transparent image layer.
- Motion is disabled for visitors who prefer reduced motion.
- No analytics or advertising scripts are included.
- External social and music embeds are not loaded in the background.
- Spotify cover art is shown uncropped and links back to the official Spotify release.

## Legal review

The privacy and terms pages are substantially improved and written for the South African context, but they should still be reviewed by a qualified legal professional before they are treated as final legal documents.
