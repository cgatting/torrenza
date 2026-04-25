const express = require('express');
const router = express.Router();
const os = require('os');
const diskinfo = require('node-disk-info');

router.get('/drives', async (req, res) => {
  try {
    const drives = await diskinfo.getDiskInfo();
    
    const formattedDrives = drives.map(drive => ({
      letter: drive.mounted,
      label: drive.filesystem,
      totalSpace: drive.blocks,
      freeSpace: drive.available,
      type: drive.mounted.includes(':') ? 'local' : 'network'
    }));

    res.json({ drives: formattedDrives });
  } catch (error) {
    console.error('Error getting drive info:', error);
    res.status(500).json({ error: 'Failed to retrieve drives' });
  }
});

module.exports = router;
