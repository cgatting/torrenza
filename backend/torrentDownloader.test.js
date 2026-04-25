const torrentDownloader = require('./src/services/torrentDownloader');

describe('TorrentDownloader File Size Validation', () => {
  const manager = new torrentDownloader.TorrentDownloaderManager();

  describe('parseSizeToBytes', () => {
    it('should correctly parse KB', () => {
      expect(manager.parseSizeToBytes('1.5 KB')).toBe(1.5 * 1024);
    });

    it('should correctly parse MB', () => {
      expect(manager.parseSizeToBytes('10.24 MB')).toBe(10.24 * 1024 * 1024);
    });

    it('should correctly parse GB', () => {
      expect(manager.parseSizeToBytes('3.4 GB')).toBe(3.4 * 1024 * 1024 * 1024);
    });

    it('should handle missing spaces', () => {
      expect(manager.parseSizeToBytes('500MB')).toBe(500 * 1024 * 1024);
    });

    it('should return 0 for invalid formats', () => {
      expect(manager.parseSizeToBytes('Unknown')).toBe(0);
      expect(manager.parseSizeToBytes(null)).toBe(0);
      expect(manager.parseSizeToBytes(undefined)).toBe(0);
    });
  });

  describe('addTorrentUrl - Size Recording', () => {
    it('should initialize torrent with correct expected size', async () => {
      // Mock startPythonWorker to avoid actual spawn during test
      manager.startPythonWorker = jest.fn();

      const magnet = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c';
      const name = 'Test Torrent';
      const sizeStr = '2.5 GB';
      const expectedBytes = 2.5 * 1024 * 1024 * 1024;

      const result = await manager.addTorrentUrl(magnet, name, sizeStr);
      
      expect(result.status).toBe('success');
      expect(result.hash).toBe('dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c');

      const torrentData = manager.torrents.get(result.hash);
      
      expect(torrentData).toBeDefined();
      expect(torrentData[3]).toBe(expectedBytes); // Expected size index
      expect(torrentData._downloadFolderName).toBe('Test Torrent');
      expect(torrentData._savePath).toContain('Test Torrent');
      expect(manager.startPythonWorker).toHaveBeenCalledWith(
        result.hash,
        magnet,
        expect.stringContaining('Test Torrent'),
        expectedBytes
      );
    });
  });
});
