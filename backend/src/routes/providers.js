const express = require('express');
const router = express.Router();
const { AVAILABLE_SOURCES, readSettings } = require('../services/settingsStore');
const { testProvider, SEARCH_TIMEOUT_MS } = require('../services/torrentSearch');

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Test timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
}

// GET /api/providers - list providers with metadata and enabled state
router.get('/', (req, res) => {
  const enabledSources = readSettings().enabledSources || [];

  const providers = AVAILABLE_SOURCES.map((source) => ({
    ...source,
    enabled: enabledSources.includes(source.id),
  }));

  res.json({ providers });
});

// POST /api/providers/test - health-check one or more providers
router.post('/test', async (req, res) => {
  const { providers: requested = [], query = 'test' } = req.body;
  const enabledSources = readSettings().enabledSources || [];

  const targets = requested.length > 0
    ? AVAILABLE_SOURCES.filter((source) => requested.includes(source.id))
    : AVAILABLE_SOURCES.filter((source) => enabledSources.includes(source.id));

  if (targets.length === 0) {
    return res.json({ results: [] });
  }

  const results = await Promise.all(
    targets.map(async (source) => {
      let test;
      try {
        test = await withTimeout(testProvider(source.id, query), SEARCH_TIMEOUT_MS + 10000);
      } catch (err) {
        test = { ok: false, latencyMs: -1, resultCount: 0, error: err.message };
      }
      return {
        id: source.id,
        label: source.label,
        type: source.type,
        color: source.color,
        enabled: enabledSources.includes(source.id),
        ...test,
      };
    })
  );

  res.json({ results });
});

module.exports = router;
