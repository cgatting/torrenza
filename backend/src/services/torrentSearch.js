const https = require('https');
const http = require('http');
const axios = require('axios');

const SEARCH_TIMEOUT_MS = 15000;
const MAGNET_TIMEOUT_MS = 8000;
const DETAIL_FETCH_CONCURRENCY = 5;
const DETAIL_FETCH_LIMIT = 15;

const DOH_ENDPOINTS = [
  'https://dns.google/resolve',
  'https://cloudflare-dns.com/dns-query',
];

const dnsCache = new Map();
const dnsEndpointFailures = new Map();

function resolveViaDoh(hostname) {
  return DOH_ENDPOINTS.reduce((chain, endpoint) => {
    return chain.catch(() => {
      if (dnsEndpointFailures.get(endpoint) > Date.now()) {
        throw new Error(`DoH endpoint ${endpoint} marked down`);
      }
      return new Promise((resolve, reject) => {
        const url = `${endpoint}?name=${encodeURIComponent(hostname)}&type=A`;
        const req = https.get(url, {
          headers: { accept: 'application/dns-json' },
          timeout: 6000,
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const ips = (parsed.Answer || [])
                .filter((answer) => answer.type === 1)
                .map((answer) => answer.data);
              if (!ips.length) {
                reject(new Error(`NO_ANSWER ${hostname}`));
                return;
              }
              const ttl = Math.min(300, Math.max(30, parsed.Answer && parsed.Answer[0] && parsed.Answer[0].TTL || 60));
              dnsCache.set(hostname, { ips, expires: Date.now() + ttl * 1000 });
              resolve({ ips, ttl });
            } catch (err) {
              reject(err);
            }
          });
        });
        req.on('timeout', () => req.destroy(new Error('DoH timeout')));
        req.on('error', reject);
      });
    });
  }, Promise.reject());
}

async function dohLookup(hostname, options, callback) {
  const cached = dnsCache.get(hostname);
  const ips = cached && cached.expires > Date.now() ? cached.ips : null;

  if (ips) {
    if (options && options.all) return callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
    return callback(null, ips[0], 4);
  }

  try {
    const { ips: resolved } = await resolveViaDoh(hostname);
    if (options && options.all) return callback(null, resolved.map((ip) => ({ address: ip, family: 4 })));
    callback(null, resolved[0], 4);
  } catch (dohError) {
    require('dns').lookup(hostname, options, callback);
  }
}

function createAgent() {
  return {
    httpsAgent: new https.Agent({ lookup: dohLookup, keepAlive: true }),
    httpAgent: new http.Agent({ lookup: dohLookup, keepAlive: true }),
  };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function httpGet(url, { timeout = SEARCH_TIMEOUT_MS, maxRedirects = 3 } = {}) {
  const response = await axios.get(url, {
    ...createAgent(),
    timeout,
    maxRedirects,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/json,*/*;q=0.8',
    },
    responseType: 'text',
  });
  return response.data;
}

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMagnets(html) {
  const magnets = [];
  const magnetRegex = /magnet:\?xt=urn:btih:[a-fA-F0-9]{40}(?:&[^"'<>\s]*)*/g;
  let match;
  while ((match = magnetRegex.exec(html)) !== null) {
    if (magnets.length < 10) magnets.push(decodeEntities(match[0]));
    else break;
  }
  return magnets;
}

const STOPWORD_TOKENS = new Set(['the', 'and', 'for', 'with', 'of', 'from', 'season', 'episode']);

function getRelevanceTokens(query) {
  const tokens = (query || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.filter((token) => (
    token.length >= 3
    && !/^\d+$/.test(token)
    && !/^s\d{1,2}$/i.test(token)
    && !STOPWORD_TOKENS.has(token)
  ));
}

function hasRelevantRows(rows, tokens) {
  if (!rows.length) return false;
  if (!tokens.length) return true;
  return rows.some((row) => tokens.some((token) => (row.title || '').toLowerCase().includes(token)));
}

function parse1337xRows(html, baseUrl) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const results = [];

  rows.forEach((row) => {
    const titleMatch = row.match(/<a[^>]+href="(\/torrent\/\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) return;
    const title = decodeEntities(titleMatch[2]).replace(/<[^>]*>/g, '').trim();
    if (!title) return;

    const seedsMatch = row.match(/class="coll-2 seeds"[^>]*>\s*([\d,.]+)/);
    const leechesMatch = row.match(/class="coll-3 leeches"[^>]*>\s*([\d,.]+)/);
    const sizeMatch = row.match(/class="coll-4 size[^"]*"[^>]*>\s*([^<]+)/);

    results.push({
      title,
      seeds: parseInt((seedsMatch && seedsMatch[1] || '0').replace(/,/g, ''), 10) || 0,
      peers: parseInt((leechesMatch && leechesMatch[1] || '0').replace(/,/g, ''), 10) || 0,
      size: sizeMatch ? sizeMatch[1].trim() : '',
      provider: '1337x',
      detailUrl: baseUrl + titleMatch[1],
    });
  });

  return results;
}

async function searchX1337x(query) {
  const mirrors = [
    'https://1377x.to',
    'https://www.1377x.to',
    'https://1337x.to',
    'https://1337x.st',
    'https://x1337x.ws',
    'https://x1337x.eu',
  ];

  const tokens = getRelevanceTokens(query);

  const attempts = mirrors.map(async (mirror) => {
    const html = await httpGet(`${mirror}/search/${encodeURIComponent(query)}/1/`);
    if (!/\/torrent\/\d+\//.test(html)) throw new Error(`Invalid page from ${mirror}`);
    const rows = parse1337xRows(html, mirror);
    if (!hasRelevantRows(rows, tokens)) throw new Error(`No relevant results from ${mirror}`);
    return rows;
  });

  let results;
  try {
    results = await Promise.race([
      Promise.any(attempts),
      new Promise((_, reject) => setTimeout(() => reject(new Error('1337x mirrors timed out')), 10000)),
    ]);
  } catch (aggregateError) {
    throw new Error('All 1337x mirrors failed');
  }

  results.sort((a, b) => b.seeds - a.seeds);
  return results.slice(0, DETAIL_FETCH_LIMIT);
}

async function resolveX1337xMagnet(result) {
  try {
    const html = await httpGet(result.detailUrl, { timeout: MAGNET_TIMEOUT_MS });
    const magnets = extractMagnets(html);
    return magnets[0] || '';
  } catch (err) {
    return '';
  }
}

async function searchNyaa(query) {
  const html = await httpGet(`https://nyaa.si/?f=0&c=0_0&q=${encodeURIComponent(query)}`);
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const results = [];

  rows.forEach((row) => {
    const magnetMatch = row.match(/href="(magnet:[^"]+)"/);
    if (!magnetMatch) return;
    const magnet = decodeEntities(magnetMatch[1]);

    const titleMatch = row.match(/href="\/view\/\d+"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) return;
    const title = decodeEntities(titleMatch[1]).replace(/<[^>]*>/g, '').trim();
    if (!title) return;

    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    const seedsCell = cells[5] || '';
    const leechesCell = cells[6] || '';
    const sizeCell = cells[3] || '';

    results.push({
      title,
      seeds: parseInt((seedsCell.match(/([\d,.]+)/) || [])[1] || '0', 10) || 0,
      peers: parseInt((leechesCell.match(/([\d,.]+)/) || [])[1] || '0', 10) || 0,
      size: (sizeCell.match(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/) || [])[1]?.trim() || '',
      provider: 'Nyaa',
      magnet,
      detailUrl: '',
    });
  });

  return results;
}

function mapSourceName(source) {
  const lower = (source || '').toLowerCase();
  if (lower.includes('1337') || lower.includes('1377')) return '1337x';
  if (lower === 'nyaa' || lower.includes('nyaa')) return 'Nyaa';
  if (lower.includes('lime')) return 'LimeTorrents';
  return source;
}

async function searchLimeTorrents(query) {
  const slug = (query || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) return [];
  const html = await httpGet(`https://www.limetorrents.lol/search/all/${slug}/`);
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const results = [];

  rows.forEach((row) => {
    const hashMatch = row.match(/itorrents\.net\/torrent\/([0-9A-Fa-f]{40})\.torrent/);
    if (!hashMatch) return;
    const titleMatch = row.match(/<a[^>]+href="\/[^"]+-torrent-\d+\.html"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) return;
    const title = decodeEntities(titleMatch[1]).replace(/<[^>]*>/g, '').trim();
    if (!title) return;

    const seedsMatch = row.match(/class="tdseed"[^>]*>\s*([\d,]+)/);
    const leechesMatch = row.match(/class="tdleech"[^>]*>\s*([\d,]+)/);
    const sizeMatch = row.match(/class="tdnormal"[^>]*>\s*([^<]+)<\/td>\s*<td class="tdseed"/);

    results.push({
      title,
      seeds: parseInt((seedsMatch && seedsMatch[1] || '0').replace(/,/g, ''), 10) || 0,
      peers: parseInt((leechesMatch && leechesMatch[1] || '0').replace(/,/g, ''), 10) || 0,
      size: sizeMatch ? sizeMatch[1].trim() : '',
      provider: 'LimeTorrents',
      magnet: `magnet:?xt=urn:btih:${hashMatch[1].toUpperCase()}`,
      detailUrl: '',
    });
  });

  results.sort((a, b) => b.seeds - a.seeds);
  return results.slice(0, DETAIL_FETCH_LIMIT);
}

function parseJsonResponse(body, provider) {
  try {
    return typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    throw new Error(`Invalid response from ${provider}`);
  }
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index ? 2 : 0)} ${units[index]}`;
}

async function searchPirateBay(query) {
  const data = parseJsonResponse(await httpGet(`https://apibay.org/q.php?q=${encodeURIComponent(query)}`), 'The Pirate Bay');
  if (!Array.isArray(data)) throw new Error('Invalid response from The Pirate Bay');
  return data.filter((item) => item.name && /^[a-f0-9]{40}$/i.test(item.info_hash || '') && !/^0{40}$/.test(item.info_hash))
    .map((item) => ({
      title: item.name,
      seeds: Number(item.seeders) || 0,
      peers: Number(item.leechers) || 0,
      size: formatBytes(item.size),
      provider: 'The Pirate Bay',
      magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
      detailUrl: '',
    }));
}

async function searchYts(query) {
  const data = parseJsonResponse(await httpGet(`https://movies-api.accel.li/api/v2/list_movies.json?limit=50&query_term=${encodeURIComponent(query)}`), 'YTS');
  if (data?.status !== 'ok' || !data.data || (data.data.movies && !Array.isArray(data.data.movies))) {
    throw new Error('Invalid response from YTS');
  }
  return (data.data.movies || []).flatMap((movie) => (movie.torrents || [])
    .filter((torrent) => movie.title && /^[a-f0-9]{40}$/i.test(torrent.hash || ''))
    .map((torrent) => {
      const title = [movie.title, movie.year, torrent.quality, torrent.type].filter(Boolean).join(' ');
      return {
        title,
        seeds: Number(torrent.seeds) || 0,
        peers: Number(torrent.peers) || 0,
        size: torrent.size || formatBytes(torrent.size_bytes),
        provider: 'YTS',
        magnet: `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(title)}`,
        detailUrl: '',
      };
    }));
}

// Cache public API responses briefly to respect provider request limits.
const apiSearchCache = new Map();
async function searchJsonIndex(source, query) {
  const key = `${source}:${query.toLowerCase()}`;
  const cached = apiSearchCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.results;
  const urls = {
    Bitsearch: `https://bitsearch.eu/api/v1/search?q=${encodeURIComponent(query)}&limit=100`,
    YourBittorrent: `https://yourbittorrent.com/api/search.json?q=${encodeURIComponent(query.slice(0, 100))}&limit=100`,
    TorrentFunk: `https://www.torrentfunk.com/api/search.json?q=${encodeURIComponent(query.slice(0, 100))}&limit=100`,
  };
  const data = parseJsonResponse(await httpGet(urls[source]), source);
  if (!Array.isArray(data?.results) || (data.status && data.status !== 'ok') || data.success === false) {
    throw new Error(`Invalid response from ${source}`);
  }
  const results = data.results.filter((item) => (item.title || item.name) && /^[a-f0-9]{40}$/i.test(item.infohash || ''))
    .map((item) => {
      const title = item.title || item.name;
      return {
        title, provider: source,
        seeds: Number(item.seeders ?? item.seeds) || 0,
        peers: Number(item.leechers ?? item.peers) || 0,
        size: typeof item.size === 'string' ? item.size : formatBytes(item.size_bytes ?? item.size),
        magnet: item.magnet?.startsWith('magnet:?') ? item.magnet : `magnet:?xt=urn:btih:${item.infohash}&dn=${encodeURIComponent(title)}`,
        detailUrl: '',
      };
    });
  if (apiSearchCache.size >= 300) apiSearchCache.delete(apiSearchCache.keys().next().value);
  apiSearchCache.set(key, { results, expires: Date.now() + 15 * 60 * 1000 });
  return results;
}

let tspApiKeyPromise;
async function searchTspIndexer(indexer, query) {
  if (!tspApiKeyPromise) {
    tspApiKeyPromise = axios.post('https://api.tspsearch.dev/api/v1/key', {}, { ...createAgent(), timeout: SEARCH_TIMEOUT_MS })
      .then((response) => response.data.apikey)
      .catch((error) => { tspApiKeyPromise = null; throw error; });
  }
  const apikey = await tspApiKeyPromise;
  const url = `https://api.tspsearch.dev/api/v1/search?q=${encodeURIComponent(query)}&limit=100&indexers=${encodeURIComponent(indexer)}&apikey=${encodeURIComponent(apikey)}`;
  const data = parseJsonResponse(await httpGet(url), `TSP ${indexer}`);
  if (!Array.isArray(data.torrents)) throw new Error(`Invalid response from TSP ${indexer}`);
  return data.torrents.filter((item) => item.name && /^[a-f0-9]{40}$/i.test(item.infohash || ''))
    .map((item) => ({ title: item.name, seeds: Number(item.seeders) || 0, peers: Number(item.leechers) || 0,
      size: formatBytes(item.size_bytes), provider: `TSP:${indexer}`,
      magnet: item.magnet || `magnet:?xt=urn:btih:${item.infohash}&dn=${encodeURIComponent(item.name)}`, detailUrl: '' }));
}

async function searchProvider(source, query) {
  if ((source || '').startsWith('TSP:')) return searchTspIndexer(source.slice(4), query);
  const mapped = mapSourceName(source);
  if (['Bitsearch', 'YourBittorrent', 'TorrentFunk'].includes(mapped)) return searchJsonIndex(mapped, query);
  if (mapped === 'The Pirate Bay') return searchPirateBay(query);
  if (mapped === 'YTS') return searchYts(query);
  if (mapped === '1337x') return searchX1337x(query);
  if (mapped === 'Nyaa') return searchNyaa(query);
  if (mapped === 'LimeTorrents') return searchLimeTorrents(query);
  throw new Error(`Unsupported source: ${source}`);
}

async function resolveMagnet(torrent) {
  if (torrent.magnet) return torrent.magnet;
  if (torrent.provider === '1337x') return resolveX1337xMagnet(torrent);
  return '';
}

async function testProvider(source, query = 'test') {
  const startedAt = Date.now();
  try {
    const torrents = await searchProvider(source, query);
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      resultCount: torrents.length,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      resultCount: 0,
      error: err && err.message ? err.message : 'Test failed',
    };
  }
}

async function runConcurrent(items, concurrency, worker) {
  const results = new Array(items.length).fill(null);
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

module.exports = {
  searchProvider,
  resolveMagnet,
  testProvider,
  runConcurrent,
  DETAIL_FETCH_CONCURRENCY,
  SEARCH_TIMEOUT_MS,
};
