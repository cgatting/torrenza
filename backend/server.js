require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Import Routes
const torrentRoutes = require('./src/routes/torrents');
const systemRoutes = require('./src/routes/system');
const downloadRoutes = require('./src/routes/downloads');
const settingsRoutes = require('./src/routes/settings');
const providerRoutes = require('./src/routes/providers');

// Mount Routes
app.use('/api/torrents', torrentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/providers', providerRoutes);

// Serve the bundled frontend from the backend dist folder.
// In packaged builds, pkg snapshots this directory under C:\snapshot\backend\dist.
const path = require('path');
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`Server running on port ${PORT}`);

  if (process.env.TORRENZA_OPEN_BROWSER === '1') {
    exec(`start "" "${url}"`);
  }
});

module.exports = app;
