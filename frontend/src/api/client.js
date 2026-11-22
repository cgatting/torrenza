import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MS = 90000;

const client = axios.create({
  baseURL: '/api',
  timeout: DEFAULT_TIMEOUT_MS,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const searchTorrents = (params) =>
  client.get('/torrents/search', { params, timeout: SEARCH_TIMEOUT_MS });

export const getDownloads = () =>
  client.get('/downloads');

export const startDownload = (data) =>
  client.post('/downloads/start', data);

export const previewMagnet = (data) =>
  client.post('/downloads/preview', data);

export const stopDownload = (hash) =>
  client.post(`/downloads/${hash}/stop`);

export const startDownloadByHash = (hash) =>
  client.post(`/downloads/${hash}/start`);

export const removeDownload = (hash) =>
  client.delete(`/downloads/${hash}`);

export const openDownloadInExplorer = (hash) =>
  client.post(`/downloads/${hash}/open`);

export const getDownloadProgress = (hash) =>
  client.get(`/downloads/progress/${hash}`);

export const getSystemDrives = () =>
  client.get('/system/drives');

const HOSTED = import.meta.env.VITE_HOSTED === 'true';
const HOSTED_DEFAULTS = { downloadPath: '', maxSpeed: 0, maxConnections: 200, maxActiveDownloads: 5, maxActiveSeeds: 10, listenPort: 6881, sslVerification: true, copyrightFilter: true, enabledSources: [] };
export const getSettings = () => HOSTED ? Promise.resolve({ data: HOSTED_DEFAULTS }) : client.get('/settings');
export const saveSettings = (data) => HOSTED ? Promise.resolve({ data }) : client.post('/settings', data);
export const isHosted = HOSTED;
export const openMagnet = (magnet) => { window.location.href = magnet; };

export const getProviders = () =>
  client.get('/providers');

export const testProviders = (data) =>
  client.post('/providers/test', data, { timeout: 90000 });

export default client;
