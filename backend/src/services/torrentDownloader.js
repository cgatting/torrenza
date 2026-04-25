const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

class TorrentDownloaderManager {
  constructor() {
    this.torrents = new Map();
    // In pkg, process.pkg is defined. 
    // We should write the worker script to a temporary directory if it's packaged.
    if (process.pkg) {
      const runtimeDir = path.join(path.dirname(process.execPath), 'data', 'runtime');
      this.workerScript = path.join(runtimeDir, 'torrentp_worker.py');
      fs.mkdirSync(runtimeDir, { recursive: true });
      if (!fs.existsSync(this.workerScript)) {
        fs.writeFileSync(this.workerScript, fs.readFileSync(path.join(__dirname, 'torrentp_worker.py')));
      }
      this.pythonExecutable = path.join(path.dirname(process.execPath), '.venv', 'Scripts', 'python.exe');
    } else {
      this.workerScript = path.join(__dirname, 'torrentp_worker.py');
      this.pythonExecutable = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
    }
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    if (typeof sizeStr === 'number') return sizeStr;
    
    const str = sizeStr.toString().toUpperCase().trim();
    const match = str.match(/([\d.]+)\s*(KB|MB|GB|TB|B)/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'TB': return value * 1024 * 1024 * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'KB': return value * 1024;
      case 'B': return value;
      default: return 0;
    }
  }

  getProjectRoot() {
    if (process.pkg) {
      return path.dirname(process.execPath);
    }

    return path.resolve(__dirname, '..', '..', '..');
  }

  getDefaultDownloadBaseDir() {
    return path.join(this.getProjectRoot(), 'downloads');
  }

  sanitizePathSegment(value, fallback) {
    const cleaned = (value || fallback || 'Download')
      .toString()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');

    return cleaned.slice(0, 120) || fallback || 'Download';
  }

  createDownloadFolderName(name, hash) {
    let folderName = (name || hash || 'Download').toString();

    folderName = folderName
      .replace(/\[[^\]]*]/g, ' ')
      .replace(/\([^)]*(?:19|20)\d{2}[^)]*\)/g, ' ')
      .replace(/[._]+/g, ' ');

    const yearMatch = folderName.match(/\b(?:19|20)\d{2}\b/);
    if (yearMatch && yearMatch.index > 0) {
      folderName = folderName.slice(0, yearMatch.index);
    }

    folderName = folderName
      .replace(/\b(?:480p|720p|1080p|2160p|4k|webrip|web-dl|bluray|brrip|hdrip|dvdrip|x264|x265|h264|h265|hevc|aac|ac3|dts|yify|yts|ag)\b/gi, ' ')
      .replace(/\.(?:mkv|mp4|avi|mov|webm|m4v)$/i, ' ');

    return this.sanitizePathSegment(folderName, hash || 'Download');
  }

  async listTorrents() {
    return { torrents: Array.from(this.torrents.values()) };
  }

  async addTorrentUrl(url, name, expectedSizeStr, destination) {
    const hashMatch = url.match(/btih:([a-zA-Z0-9]+)/);
    const hash = hashMatch ? hashMatch[1] : crypto.randomBytes(20).toString('hex');
    const expectedSizeBytes = Math.max(0, Math.floor(this.parseSizeToBytes(expectedSizeStr)));
    
    console.log(`[TorrentDownloader] Adding torrent: ${name || hash}`);
    console.log(`[TorrentDownloader] Expected metadata size: ${expectedSizeBytes} bytes (${expectedSizeStr})`);

    const baseSaveDir = destination
      ? path.resolve(destination)
      : this.getDefaultDownloadBaseDir();
    const downloadFolderName = this.createDownloadFolderName(name, hash);
    const savePath = path.join(baseSaveDir, downloadFolderName);
    
    const torrentData = [
      hash,
      201, // 201 = Downloading
      name || 'Unknown Torrent',
      expectedSizeBytes,
      0, // progress (per mils)
      0, // downloaded bytes
      0, // uploaded bytes
      0, // ratio
      0, // uploadSpeed
      0, // downloadSpeed
      -1, // eta
      '', // label
      0, // peers connected
      0, // peers in swarm
      0, // seeds connected
      0, // seeds in swarm
      65536, // availability
      this.torrents.size, // queue order
      expectedSizeBytes, // remaining
      url // url
    ];
    
    this.torrents.set(hash, torrentData);
    torrentData._savePath = savePath;
    torrentData._downloadFolderName = downloadFolderName;
    
    this.startPythonWorker(hash, url, savePath, expectedSizeBytes);
    
    return { status: 'success', hash, savePath, downloadFolderName };
  }
  
  startPythonWorker(hash, magnet, savePath, expectedSize) {
    console.log(`[TorrentDownloader] Spawning python worker for ${hash}`);
    const pythonCmd = this.getPythonCommand();
    console.log(`[TorrentDownloader] Using python executable: ${pythonCmd}`);
    const pythonProcess = spawn(pythonCmd, [
      this.workerScript,
      magnet,
      savePath,
      expectedSize.toString(),
    ]);
    
    // Store process to allow stopping
    const torrentData = this.torrents.get(hash);
    if (torrentData) {
      torrentData._process = pythonProcess;
    }

    pythonProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'log') {
             console.log(`[Python Worker - ${parsed.level.toUpperCase()}] ${parsed.message}`, parsed.data ? parsed.data : '');
             
             if (parsed.message === 'Progress update') {
               const t = this.torrents.get(hash);
               if (t) {
                 const downloadedBytes = Number(parsed.data.downloaded_bytes || 0);
                 const totalWanted = Number(parsed.data.total_wanted || t[3] || expectedSize || 0);
                 const progressPercent = Number(
                   parsed.data.progress_percent
                     ?? (totalWanted > 0 ? (downloadedBytes / totalWanted) * 100 : 0),
                 );
                 const downloadRate = Number(parsed.data.download_rate || 0);
                 const uploadRate = Number(parsed.data.upload_rate || 0);
                 const remaining = Math.max(0, totalWanted - downloadedBytes);

                 t[3] = totalWanted > 0 ? totalWanted : t[3];
                 t[5] = downloadedBytes;
                 t[4] = Math.max(0, Math.min(1000, Math.floor(progressPercent * 10)));
                 t[8] = uploadRate;
                 t[9] = downloadRate;
                 t[10] = downloadRate > 0 ? Math.floor(remaining / downloadRate) : -1;
                 t[12] = Number(parsed.data.num_peers || t[12] || 0);
                 t[18] = remaining;

                 if (parsed.data.is_seeding) {
                   t[1] = 136;
                   t[4] = 1000;
                   t[9] = 0;
                   t[10] = 0;
                 }
              }
             }
          } else if (parsed.type === 'result') {
             console.log(`[Python Worker - RESULT] Status: ${parsed.status}`, parsed);
             const t = this.torrents.get(hash);
             if (t) {
               if (parsed.status === 'success') {
                 t[1] = 136; // 136 = Seeding/Completed
                 t[4] = 1000; // 100%
                 t[9] = 0; // speed 0
                 t[10] = 0; // ETA 0
                 t[5] = parsed.actual_size || t[5] || expectedSize; // final downloaded size
               } else {
                 t[1] = 32; // Paused/error
                 t[9] = 0;
                 t[10] = -1;
                 t[11] = `error:${parsed.message || 'download failed'}`;
               }
             }
          }
        } catch (e) {
          // Non-JSON output
          console.log(`[Python Worker - RAW] ${line}`);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Worker - STDERR] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[TorrentDownloader] Python worker for ${hash} exited with code ${code}`);
      const t = this.torrents.get(hash);
      if (t && t[1] === 201) { // If still downloading, mark as stopped/error
        t[1] = 32; // Paused
        t[9] = 0;
      }
    });
  }

  getPythonCommand() {
    if (fs.existsSync(this.pythonExecutable)) {
      return this.pythonExecutable;
    }
    return 'python';
  }

  async startTorrent(hash) {
    const t = this.torrents.get(hash);
    if (t) {
      if (t[1] === 32 || t[1] === 16) {
        // Resume
        const resumeSavePath = t._savePath || path.join(
          this.getDefaultDownloadBaseDir(),
          this.createDownloadFolderName(t[2], hash),
        );
        this.startPythonWorker(hash, t[19], resumeSavePath, t[3]);
        t[1] = 201;
      }
    }
    return { status: 'success' };
  }

  async stopTorrent(hash) {
    const t = this.torrents.get(hash);
    if (t) {
      if (t._process) {
        t._process.kill();
        delete t._process;
      }
      t[1] = 32; // Paused
      t[8] = 0;
      t[9] = 0;
    }
    return { status: 'success' };
  }

  async removeTorrent(hash) {
    this.stopTorrent(hash);
    this.torrents.delete(hash);
    return { status: 'success' };
  }
}

const torrentDownloader = new TorrentDownloaderManager();
torrentDownloader.TorrentDownloaderManager = TorrentDownloaderManager; // Export class for testing
module.exports = torrentDownloader;
