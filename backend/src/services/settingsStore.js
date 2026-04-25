const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = process.pkg
  ? path.resolve(path.dirname(process.execPath), 'data', 'settings.json')
  : path.resolve(__dirname, '..', '..', 'settings.json');

const AVAILABLE_SOURCES = [
  '1337x',
  'Eztv',
  'KickassTorrents',
  'Limetorrents',
  'Rarbg',
  'ThePirateBay',
  'Torrent9',
  'TorrentProject',
  'Torrentz2',
  'Yts',
];

const DEFAULT_SETTINGS = {
  utorrent_host: 'localhost',
  utorrent_port: 8080,
  ssl_verification: true,
  copyright_filter: true,
  enabledSources: AVAILABLE_SOURCES,
};

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return DEFAULT_SETTINGS.enabledSources;

  const validSources = sources.filter((source) => AVAILABLE_SOURCES.includes(source));
  return validSources.length > 0 ? [...new Set(validSources)] : DEFAULT_SETTINGS.enabledSources;
}

function normalizeSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabledSources: normalizeSources(settings && settings.enabledSources),
    availableSources: AVAILABLE_SOURCES,
  };
}

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return normalizeSettings(DEFAULT_SETTINGS);
    }

    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to read settings, using defaults:', error.message);
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

function writeSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);
  const persisted = { ...normalized };
  delete persisted.availableSources;

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(persisted, null, 2));
  return normalized;
}

module.exports = {
  AVAILABLE_SOURCES,
  readSettings,
  writeSettings,
  normalizeSources,
};
