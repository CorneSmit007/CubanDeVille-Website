# Update notes — August 2026

## Added

- Social platform chooser modal for Instagram, TikTok, X and YouTube.
- Automatic Spotify catalogue sync through the secure Vercel endpoint `/api/releases`.
- Automatic latest-release title, type, date, cover art, link, recent releases, ticker and music-modal updates.
- Resilient static release fallback when Spotify is not configured or temporarily unavailable.
- Spotify environment-variable template in `.env.example`.
- Responsive title sizing for long release names.

## Refined

- Replaced Unicode play symbols with SVG artwork to prevent iPhone emoji rendering.
- Reworked the globe emblem on iPhone/WebKit to use a stable composited PNG layer and prevent flickering.
- Improved touch modal scrolling, focus trapping and switching between platform directories.
- Added Spotify API and edge caching for fast, controlled catalogue refreshes.
- Verified layouts from 320px to 1920px with no horizontal overflow.
