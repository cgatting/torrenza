import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const searchTorrents = (params) =>
  client.get('/torrents/search', { params });

export const getDownloads = () =>
  client.get('/downloads');

export const startDownload = (data) =>
  client.post('/downloads/start', data);

export const stopDownload = (hash) =>
  client.post(`/downloads/${hash}/stop`);

export const startDownloadByHash = (hash) =>
  client.post(`/downloads/${hash}/start`);

export const removeDownload = (hash) =>
  client.delete(`/downloads/${hash}`);

export const getDownloadProgress = (hash) =>
  client.get(`/downloads/progress/${hash}`);

export const getSystemDrives = () =>
  client.get('/system/drives');

export const getSettings = () =>
  client.get('/settings');

export const saveSettings = (data) =>
  client.post('/settings', data);

export default client;
