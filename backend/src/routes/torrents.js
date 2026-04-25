const express = require('express');
const router = express.Router();
const TorrentSearchApi = require('torrent-search-api');
const { readSettings, normalizeSources } = require('../services/settingsStore');

TorrentSearchApi.enablePublicProviders();

const FILE_TYPE_PATTERNS = {
  video: /\.(mkv|mp4|avi|mov|webm|m4v|wmv|flv)\b|(?:^|[\s._-])(720p|1080p|2160p|4k|webrip|bluray|brrip|hdrip|x264|x265|h264|h265|hevc)(?:[\s._-]|$)/i,
  audio: /\.(mp3|flac|wav|aac|ogg|m4a|wma)\b|(?:^|[\s._-])(album|soundtrack|discography|320kbps|lossless)(?:[\s._-]|$)/i,
  document: /\.(pdf|epub|mobi|azw3|docx?|xlsx?|pptx?|txt|rtf|cbz|cbr)\b|(?:^|[\s._-])(ebook|audiobook|book|manual|textbook)(?:[\s._-]|$)/i,
  software: /\.(exe|msi|dmg|pkg|apk|iso|zip|rar|7z)\b|(?:^|[\s._-])(windows|macos|linux|x64|x86|crack|serial|setup)(?:[\s._-]|$)/i,
};

const PLACEHOLDER_TITLES = new Set([
  'no results returned',
]);

function parseSizeToBytes(sizeStr) {
  if (!sizeStr) return 0;
  if (typeof sizeStr === 'number') return sizeStr;

  const match = sizeStr.toString().trim().match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'TB': return value * 1024 * 1024 * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'KB': return value * 1024;
    case 'B': return value;
    default: return 0;
  }
}

function inferFileType(name) {
  const value = name || '';
  const match = Object.entries(FILE_TYPE_PATTERNS).find(([, pattern]) => pattern.test(value));
  return match ? match[0] : 'other';
}

async function searchSource(source, query) {
  const torrents = await TorrentSearchApi.search([source], query, 'All', 20);
  return torrents.map((torrent) => ({
    ...torrent,
    provider: torrent.provider || source,
  }));
}

function normalizeSearchString(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getQueryVariants(rawQuery) {
  const normalized = rawQuery.toString().trim().replace(/\s+/g, ' ');
  const variants = [normalized];
  const seasonMatch = normalized.match(/\bS(\d{1,2})\b/i);

  if (seasonMatch) {
    const seasonNumber = parseInt(seasonMatch[1], 10);
    const paddedSeason = String(seasonNumber).padStart(2, '0');
    const withoutSeasonToken = normalized.replace(/\bS\d{1,2}\b/i, ' ').replace(/\s+/g, ' ').trim();

    if (withoutSeasonToken) {
      variants.push(withoutSeasonToken);
      variants.push(`${withoutSeasonToken} Season ${seasonNumber}`);
      variants.push(`${withoutSeasonToken} S${paddedSeason}`);
    }
  }

  return [...new Set(variants.filter(Boolean))];
}

function getQueryMatchers(rawQuery) {
  const normalized = normalizeSearchString(rawQuery);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const seasonMatches = [...normalized.matchAll(/\bs(\d{1,2})\b/g)];
  const requiredPatterns = seasonMatches.flatMap((match) => {
    const paddedSeason = String(parseInt(match[1], 10)).padStart(2, '0');
    return [
      new RegExp(`\\bs${paddedSeason}(?:e\\d{1,2}|\\b)`, 'i'),
      new RegExp(`\\bseason\\s*0?${parseInt(match[1], 10)}\\b`, 'i'),
    ];
  });

  return (title) => {
    const haystack = normalizeSearchString(title);
    const hasAllTokens = tokens.every((token) => haystack.includes(token));

    if (hasAllTokens) return true;
    if (!requiredPatterns.length) return false;

    const baseTokens = tokens.filter((token) => !/^s\d{1,2}$/.test(token));
    const hasBaseTokens = baseTokens.every((token) => haystack.includes(token));
    return hasBaseTokens && requiredPatterns.some((pattern) => pattern.test(title || ''));
  };
}

function isPlaceholderResult(torrent) {
  const title = normalizeSearchString(torrent && torrent.title);
  const magnetHash = (torrent && torrent.magnet || '').match(/btih:([a-fA-F0-9]+)/i)?.[1]?.toLowerCase();
  return PLACEHOLDER_TITLES.has(title) || magnetHash === '0000000000000000000000000000000000000000';
}

function dedupeTorrents(torrents) {
  const seen = new Map();

  torrents.forEach((torrent) => {
    if (isPlaceholderResult(torrent)) return;

    const key = [
      (torrent.magnet || '').match(/btih:([a-fA-F0-9]+)/i)?.[1],
      torrent.title,
      torrent.size,
      torrent.provider,
    ].filter(Boolean).join(':').toLowerCase();

    if (!key || seen.has(key)) return;
    seen.set(key, torrent);
  });

  return Array.from(seen.values());
}

function getFastestDownloadScore(result) {
  const seeders = Math.max(0, Number(result.seeders) || 0);
  const leechers = Math.max(0, Number(result.leechers) || 0);

  // More seeders usually means faster downloads; heavy leecher load can slow availability.
  return seeders / Math.max(1, leechers + 1);
}

router.get('/search', async (req, res) => {
  try {
    const { query, fileType = 'all', sortBy = 'seeders', sortDir = 'desc' } = req.query;

    if (!query) {
      return res.json({ results: [], totalCount: 0 });
    }

    const queryVariants = getQueryVariants(query);
    const matchesQuery = getQueryMatchers(query);
    const enabledSources = normalizeSources(readSettings().enabledSources);
    const sourceResults = await Promise.allSettled(
      enabledSources.flatMap((source) => queryVariants.map((variant) => searchSource(source, variant)))
    );
    const sourcesFailed = [];
    const searchTargets = enabledSources.flatMap((source) => queryVariants.map((variant) => ({ source, variant })));
    const torrents = dedupeTorrents(sourceResults.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value;

      sourcesFailed.push({
        source: searchTargets[index].source,
        query: searchTargets[index].variant,
        error: result.reason && result.reason.message ? result.reason.message : 'Search failed',
      });
      return [];
    })).filter((torrent) => matchesQuery(torrent.title));

    const results = await Promise.all(
      torrents.map(async (torrent) => {
        let magnetLink = torrent.magnet || '';

        // Some providers return search results without direct magnet links.
        // Try resolving the magnet lazily so the frontend can start downloads.
        if (!magnetLink) {
          try {
            magnetLink = await TorrentSearchApi.getMagnet(torrent);
          } catch (resolveError) {
            magnetLink = '';
          }
        }

        const hashMatch = magnetLink && magnetLink.match(/btih:([a-fA-F0-9]+)/i);
        const sizeBytes = parseSizeToBytes(torrent.size);
        const inferredType = inferFileType(torrent.title);
        return {
          name: torrent.title,
          size: torrent.size || 'N/A',
          sizeBytes,
          fileType: inferredType,
          seeders: parseInt(torrent.seeds) || 0,
          leechers: parseInt(torrent.peers) || 0,
          format: torrent.provider || 'Unknown',
          magnetLink,
          hasMagnet: Boolean(magnetLink),
          hash: hashMatch ? hashMatch[1] : '',
          engine: torrent.provider
        };
      })
    );

    const filteredResults = results.filter((result) => {
      if (fileType !== 'all' && result.fileType !== fileType) return false;
      return true;
    });

    const sortDirection = sortDir === 'asc' ? 1 : -1;
    const sortedResults = [...filteredResults].sort((a, b) => {
      switch (sortBy) {
        case 'fastest':
          return (
            (getFastestDownloadScore(a) - getFastestDownloadScore(b))
            || ((a.seeders || 0) - (b.seeders || 0))
            || ((b.leechers || 0) - (a.leechers || 0))
          ) * sortDirection;
        case 'size':
          return ((a.sizeBytes || 0) - (b.sizeBytes || 0)) * sortDirection;
        case 'name':
          return a.name.localeCompare(b.name) * sortDirection;
        case 'seeders':
        default:
          return ((a.seeders || 0) - (b.seeders || 0)) * sortDirection;
      }
    });

    res.json({
      results: sortedResults,
      totalCount: sortedResults.length,
      unfilteredCount: results.length,
      sourcesSearched: enabledSources,
      sourcesFailed,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search torrents', details: error.message });
  }
});

module.exports = router;
