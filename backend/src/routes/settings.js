const express = require('express');
const router = express.Router();
const { readSettings, writeSettings } = require('../services/settingsStore');

// GET settings
router.get('/', async (req, res) => {
  res.json(readSettings());
});

// POST settings (update)
router.post('/', async (req, res) => {
  const currentSettings = readSettings();
  const settings = writeSettings({
    ...currentSettings,
    ...req.body,
  });

  res.json({ status: 'updated', settings });
});

module.exports = router;
