# PopcornPlay — updated movie website

## Run locally (Windows PowerShell)
1. Install Node.js 20 or newer.
2. Extract this ZIP.
3. Open PowerShell in the `popcornplay-render-site` folder.
4. Run `npm install`.
5. Set your TMDB key for this PowerShell session:
   `$env:TMDB_API_KEY="YOUR_TMDB_API_KEY"`
6. Optional playback endpoint override (defaults to the required existing API):
   `$env:PLAYBACK_API_URL="https://tmdv.onrender.com"`
7. Run `npm start` and open `http://localhost:3000`.

Do not commit `.env` files or API keys. On Render, add `TMDB_API_KEY` in the service's Environment settings. `PLAYBACK_API_URL` is optional and defaults to `https://tmdv.onrender.com`.

## Playback behavior
- The existing TMDB integration, movie discovery UI, search, details, credits, and trailer remain.
- The backend proxy requests `/api/streams/movie/:id` from the configured playback API and forwards its JSON response without changing its format.
- The browser client currently consumes the existing project's expected response shape: `{ "streams": [ ... ] }`. Each stream should include a direct URL field (`url`, `link`, `streamUrl`, or `stream_url`) or an embed field (`embed`, `embedUrl`, or `embed_url`). Optional metadata fields such as `quality`, `resolution`, `height`, `type`, `format`, `label`, or `name` help identify quality and playback type.
- Only valid HTTP(S) stream URLs returned by the API are shown. At most three returned streams are presented as anonymized Server 1–3 labels. Provider names are not displayed as labels.
- Quality options are limited to 1080p, 720p, and 480p and only appear when the API data/URL explicitly indicates that quality. Highest available quality is selected by default. When a selected server does not have the selected quality, the UI says so rather than inventing a stream.
- Actual URL is shown with Copy link and Open link actions. MP4/direct video uses the HTML video player; HLS uses native HLS support or hls.js; recognized embed links use an iframe.
- Browser playback is not guaranteed: a host may block cross-origin playback (CORS), require cookies/headers, expire signed URLs, or prevent iframe embedding. The UI surfaces errors and lets users switch server or open the actual link.

## API routes
- `/api/health`
- `/api/trending`
- `/api/popular`
- `/api/upcoming`
- `/api/search?query=Inception`
- `/api/movie/27205`
- `/api/credits/27205`
- `/api/play/27205`
- `/test`

## Verification notes
The project source was inspected and the browser JavaScript syntax was checked with Node.js. The live playback API could not be reached from the build environment (DNS/network resolution failed), so its current live response could not be independently confirmed. The client retains the existing project's `{ streams: [...] }` contract and handles multiple common URL/quality field names without fabricating missing servers or quality options.
