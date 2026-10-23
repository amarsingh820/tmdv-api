import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const PLAYBACK_API = (process.env.PLAYBACK_API_URL || 'https://tmdv.onrender.com').replace(/\/$/, '');
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

async function tmdb(pathname, params = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const error = new Error('TMDB_API_KEY is missing. Add it in Render → Environment.');
    error.status = 500;
    throw error;
  }
  const url = new URL(TMDB_BASE + pathname);
  url.searchParams.set('api_key', key);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(name, String(value));
    }
  }
  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.status_message || `TMDB returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  cache.set(cacheKey, { time: Date.now(), data });
  return data;
}

function handleApi(handler) {
  return async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=60');
      res.json(await handler(req));
    } catch (error) {
      res.status(error.status || 502).json({ success: false, error: error.message || 'Request failed' });
    }
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'popcornplay-test', playbackConfigured: Boolean(PLAYBACK_API) }));
app.get('/api/trending', handleApi(() => tmdb('/trending/movie/day')));
app.get('/api/popular', handleApi(() => tmdb('/movie/popular')));
app.get('/api/upcoming', handleApi(() => tmdb('/movie/upcoming')));
app.get('/api/search', handleApi((req) => {
  const query = String(req.query.query || '').trim();
  if (!query) {
    const error = new Error('Please provide ?query=movie name');
    error.status = 400;
    throw error;
  }
  return tmdb('/search/movie', { query, include_adult: false });
}));
app.get('/api/movie/:id', handleApi((req) => {
  if (!/^\d+$/.test(req.params.id)) {
    const error = new Error('Invalid TMDB movie ID');
    error.status = 400;
    throw error;
  }
  return tmdb(`/movie/${req.params.id}`, { append_to_response: 'credits,videos' });
}));
app.get('/api/credits/:id', handleApi((req) => {
  if (!/^\d+$/.test(req.params.id)) {
    const error = new Error('Invalid TMDB movie ID');
    error.status = 400;
    throw error;
  }
  return tmdb(`/movie/${req.params.id}/credits`);
}));

// Optional same-origin playback proxy. It only forwards the existing API's JSON response;
// stream hosting/playback remains with the user's existing service.
app.get('/api/play/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, error: 'Invalid TMDB movie ID' });
  try {
    const response = await fetch(`${PLAYBACK_API}/api/streams/movie/${id}`, { signal: AbortSignal.timeout(60000) });
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ success: false, error: `Playback API request failed: ${error.message}` });
  }
});

app.get('/test', handleApi(async () => {
  const data = await tmdb('/search/movie', { query: 'Inception' });
  const movie = data.results?.[0];
  return { ok: true, count: data.results?.length || 0, movie: movie ? {
    title: movie.title,
    tmdb_id: movie.id,
    poster_path: movie.poster_path,
    poster_url: movie.poster_path ? IMAGE_BASE + 'w500' + movie.poster_path : null
  } : null };
}));

app.listen(port, '0.0.0.0', () => console.log(`PopcornPlay test website listening on ${port}`));
