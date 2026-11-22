const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = process.env.TORRENZA_DATA_DIR
  ? path.join(process.env.TORRENZA_DATA_DIR, 'settings.json')
  : process.pkg
    ? path.resolve(path.dirname(process.execPath), 'data', 'settings.json')
    : path.resolve(__dirname, '..', '..', 'settings.json');


const TSP_INDEXERS = [
  ['knaben', 'Knaben', 'General'], ['dmhy', 'Dmhy', 'Anime'], ['rutor', 'Rutor', 'General'],
  ['torrentkitty', 'TorrentKitty', 'General'], ['torrentscsv', 'TorrentsCSV', 'General'],
  ['torrentdownloads', 'TorrentDownloads Index', 'General'], ['1tamilmv-tamil', '1TamilMV Tamil', 'Movies'],
  ['1tamilmv-hindi', '1TamilMV Hindi', 'Movies'], ['1tamilmv-telugu', '1TamilMV Telugu', 'Movies'],
  ['1tamilmv-malayalam', '1TamilMV Malayalam', 'Movies'], ['sukebei', 'Sukebei', 'Adult'], ['nyaa', 'Nyaa via TSP', 'Anime'],
  ['piratebay', 'Pirate Bay via TSP', 'General'], ['yts', 'YTS via TSP', 'Movies'], ['bitsearch', 'Bitsearch via TSP', 'General'],
];

const AVAILABLE_SOURCES = [
  ...TSP_INDEXERS.map(([indexer, label, type]) => ({ id: `TSP:${indexer}`, label, type, description: `Searches ${label} through the TSP multi-index service.`, color: '#d89567' })),
  { id: 'Bitsearch', label: 'Bitsearch', type: 'General', description: 'Searches the Bitsearch torrent index.', color: '#70b7ff' },
  { id: 'YourBittorrent', label: 'YourBittorrent', type: 'General', description: 'General index with direct magnet links.', color: '#c092e8' },
  { id: 'TorrentFunk', label: 'TorrentFunk', type: 'General', description: 'General index with direct magnet links.', color: '#e7bd61' },
  {
    id: 'The Pirate Bay',
    label: 'The Pirate Bay',
    type: 'General',
    description: 'General torrent index with direct magnet links.',
    color: '#d6a65c',
  },
  {
    id: 'YTS',
    label: 'YTS',
    type: 'Movies',
    description: 'Movie torrents in a range of qualities.',
    color: '#75c74e',
  },
  {
    id: '1337x',
    label: '1337x',
    type: 'General',
    description: 'One of the largest public torrent indexes, mirrors the classic 1377x domain.',
    color: '#e89557',
  },
  {
    id: 'Nyaa',
    label: 'Nyaa',
    type: 'Anime',
    description: 'The go-to index for anime, manga, and other Asian media.',
    color: '#00D9FF',
  },
  {
    id: 'LimeTorrents',
    label: 'LimeTorrents',
    type: 'General',
    description: 'General torrent index with instant magnet links and healthy seed counts.',
    color: '#3ECF8E',
  },
];

const AVAILABLE_SOURCE_IDS = AVAILABLE_SOURCES.map((source) => source.id);

const DEFAULT_SETTINGS = {
  utorrent_host: 'localhost',
  utorrent_port: 8080,
  ssl_verification: true,
  copyright_filter: true,
  enabledSources: AVAILABLE_SOURCE_IDS,
};

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return DEFAULT_SETTINGS.enabledSources;

  const validSources = sources.filter((source) => AVAILABLE_SOURCE_IDS.includes(source));
  return validSources.length > 0 ? [...new Set(validSources)] : DEFAULT_SETTINGS.enabledSources;
}

function normalizeSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabledSources: settings && settings.sourceDefaultsVersion === 1
      ? normalizeSources(settings.enabledSources)
      : [...AVAILABLE_SOURCE_IDS],
    sourceDefaultsVersion: 1,
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
  AVAILABLE_SOURCE_IDS,
  readSettings,
  writeSettings,
  normalizeSources,
};
