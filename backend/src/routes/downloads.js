const express = require('express');
const router = express.Router();
const torrentDownloader = require('../services/torrentDownloader');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.mov', '.webm', '.m4v']);

function collectFilesRecursive(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap(entry => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return collectFilesRecursive(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  });
}

function checkContainerHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 4) return { valid: false, type: 'unknown' };

    // MKV/WEBM (EBML) signature: 1A 45 DF A3
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return { valid: true, type: 'mkv/webm' };
    }

    // MP4 signature contains "ftyp" at bytes 4-7
    if (bytesRead >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') {
      return { valid: true, type: 'mp4' };
    }

    return { valid: false, type: 'unknown' };
  } finally {
    fs.closeSync(fd);
  }
}

function formatEta(seconds) {
  if (seconds === 0) return 'Complete';
  if (!Number.isFinite(seconds) || seconds < 0) return 'Calculating...';

  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function decodeParam(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function parseMagnetLink(magnet) {
  const parsed = { hash: '', name: '', trackers: [] };
  if (!magnet || !magnet.startsWith('magnet:?')) return parsed;

  const hashMatch = magnet.match(/btih:([a-zA-Z0-9]+)/i);
  if (hashMatch) parsed.hash = hashMatch[1];

  const nameMatch = magnet.match(/[?&]dn=([^&]+)/i);
  if (nameMatch) parsed.name = decodeParam(nameMatch[1]);

  const trackerRegex = /[?&]tr=([^&]+)/gi;
  let match;
  while ((match = trackerRegex.exec(magnet)) !== null) {
    parsed.trackers.push(decodeParam(match[1]));
  }

  return parsed;
}

// POST /api/downloads/preview
router.post('/preview', async (req, res) => {
  const { magnetLink } = req.body;
  if (!magnetLink) {
    return res.status(400).json({ error: 'Magnet link is required' });
  }

  const parsed = parseMagnetLink(magnetLink);
  if (!parsed.hash) {
    return res.status(400).json({ error: 'Invalid magnet link: missing info hash (btih)' });
  }

  try {
    const meta = await torrentDownloader.previewMagnet(magnetLink);
    res.json({ parsed, meta });
  } catch (error) {
    console.error('Failed to preview magnet:', error);
    res.status(500).json({ error: 'Failed to preview magnet' });
  }
});

// POST /api/downloads/start
router.post('/start', async (req, res) => {
  const { magnetLink, destination, size, name } = req.body;
  
  try {
    if (!magnetLink) {
      return res.status(400).json({ error: 'Magnet link is required' });
    }
    
    // Add torrent with size validation
    const result = await torrentDownloader.addTorrentUrl(magnetLink, name, size, destination);
    
    res.json({ status: 'started', magnetLink, destination, hash: result.hash, savePath: result.savePath });
  } catch (error) {
    console.error('Failed to start download:', error);
    res.status(500).json({ error: 'Failed to start download' });
  }
});

// GET /api/downloads/progress/:hash
router.get('/progress/:hash', async (req, res) => {
  try {
    const listData = await torrentDownloader.listTorrents();
    const torrents = listData.torrents || [];
    
    const torrent = torrents.find(t => t[0] === req.params.hash);
    
    if (!torrent) {
      return res.status(404).json({ error: 'Torrent not found' });
    }
    
    const progress = torrent[4] / 10;
    const speed = torrent[9];
    const eta = torrent[10];
    const status = torrent[1] === 201 ? 'downloading' : (torrent[1] === 136 ? 'seeding' : (torrent[1] === 32 ? 'paused' : 'stopped'));
    
    res.json({
      progress,
      speed,
      eta,
      etaLabel: formatEta(eta),
      status,
      name: torrent[2],
      size: torrent[3]
    });
  } catch (error) {
    console.error('Failed to get progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// GET /api/downloads
router.get('/', async (req, res) => {
  try {
    const listData = await torrentDownloader.listTorrents();
    const torrents = listData.torrents || [];
    
    const formattedTorrents = torrents.map(t => ({
      hash: t[0],
      status: t[1],
      name: t[2],
      size: t[3],
      progress: t[4] / 10,
      downloaded: t[5],
      uploaded: t[6],
      ratio: t[7],
      uploadSpeed: t[8],
      downloadSpeed: t[9],
      eta: t[10],
      etaLabel: formatEta(t[10]),
      label: t[11],
      peersConnected: t[12],
      peersInSwarm: t[13],
      seedsConnected: t[14],
      seedsInSwarm: t[15],
      availability: t[16],
      torrentQueueOrder: t[17],
      remaining: t[18],
      downloadUrl: t[19],
      savePath: t._savePath || null,
      downloadFolderName: t._downloadFolderName || null
    }));
    
    res.json({ downloads: formattedTorrents });
  } catch (error) {
    console.error('Failed to list torrents:', error);
    res.status(500).json({ error: 'Failed to list torrents' });
  }
});

// GET /api/downloads/verify/:hash
router.get('/verify/:hash', async (req, res) => {
  try {
    const listData = await torrentDownloader.listTorrents();
    const torrents = listData.torrents || [];
    const torrent = torrents.find(t => t[0] === req.params.hash);

    if (!torrent) {
      return res.status(404).json({ error: 'Torrent not found' });
    }

    const status = torrent[1] === 201 ? 'downloading' : (torrent[1] === 136 ? 'seeding' : (torrent[1] === 32 ? 'paused' : 'stopped'));
    const savePath = torrent._savePath || path.join(process.cwd(), 'downloads', req.params.hash);

    if (!fs.existsSync(savePath)) {
      return res.json({
        hash: req.params.hash,
        playable: false,
        reason: 'Download directory not found yet',
        status,
      });
    }

    const allFiles = collectFilesRecursive(savePath);
    const videoFiles = allFiles.filter(filePath => VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

    if (videoFiles.length === 0) {
      return res.json({
        hash: req.params.hash,
        playable: false,
        reason: 'No video files found yet',
        status,
      });
    }

    const targetFile = videoFiles
      .map(filePath => ({ filePath, size: fs.statSync(filePath).size }))
      .sort((a, b) => b.size - a.size)[0];

    const header = checkContainerHeader(targetFile.filePath);
    const seeded = status === 'seeding';

    res.json({
      hash: req.params.hash,
      playable: seeded && header.valid,
      status,
      file: targetFile.filePath,
      bytes: targetFile.size,
      container: header.type,
      headerValid: header.valid,
      reason: seeded && header.valid ? 'Playable' : 'Still downloading or incomplete container',
    });
  } catch (error) {
    console.error('Failed to verify download:', error);
    res.status(500).json({ error: 'Failed to verify download' });
  }
});

// POST /api/downloads/:hash/stop
router.post('/:hash/stop', async (req, res) => {
  try {
    await torrentDownloader.stopTorrent(req.params.hash);
    res.json({ status: 'stopped', hash: req.params.hash });
  } catch (error) {
    console.error('Failed to stop torrent:', error);
    res.status(500).json({ error: 'Failed to stop torrent' });
  }
});

// POST /api/downloads/:hash/start
router.post('/:hash/start', async (req, res) => {
  try {
    await torrentDownloader.startTorrent(req.params.hash);
    res.json({ status: 'started', hash: req.params.hash });
  } catch (error) {
    console.error('Failed to start torrent:', error);
    res.status(500).json({ error: 'Failed to start torrent' });
  }
});

// POST /api/downloads/:hash/open - open a completed download in Windows Explorer
router.post('/:hash/open', async (req, res) => {
  try {
    const listData = await torrentDownloader.listTorrents();
    const torrent = (listData.torrents || []).find(t => t[0] === req.params.hash);
    if (!torrent) return res.status(404).json({ error: 'Torrent not found' });

    const status = torrent[1];
    if (status !== 136 && (torrent[4] || 0) < 1000) {
      return res.status(409).json({ error: 'Download is not complete' });
    }

    const savePath = torrent._savePath || path.join(process.cwd(), 'downloads', req.params.hash);
    if (!fs.existsSync(savePath)) return res.status(404).json({ error: 'Download folder not found' });

    if (process.platform === 'win32') {
      spawn('explorer.exe', [savePath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [savePath], { detached: true, stdio: 'ignore' }).unref();
    }
    res.json({ status: 'opened', path: savePath });
  } catch (error) {
    console.error('Failed to open download folder:', error);
    res.status(500).json({ error: 'Failed to open download folder' });
  }
});

// DELETE /api/downloads/:hash
router.delete('/:hash', async (req, res) => {
  try {
    await torrentDownloader.removeTorrent(req.params.hash);
    res.json({ status: 'removed', hash: req.params.hash });
  } catch (error) {
    console.error('Failed to remove torrent:', error);
    res.status(500).json({ error: 'Failed to remove torrent' });
  }
});

module.exports = router;
