import { create } from 'zustand';

function readSavedLanguage() {
  try { return typeof window !== 'undefined' && window.localStorage.getItem('torrenza:language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

const savedLanguage = readSavedLanguage();

const useAppStore = create((set, get) => ({
  torrents: [],
  connection: 'connecting',
  samples: [],
  language: savedLanguage,

  setConnection: (connection) => set({ connection }),
  setLanguage: (language) => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem('torrenza:language', language); } catch { /* Language remains active for this session. */ }
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    set({ language });
  },
  recordDownloads: (downloads) => set((state) => {
    const previous = new Map(state.torrents.map(torrent => [torrent.hash, torrent._addedAt]));
    const now = Date.now();
    const torrents = downloads.map(torrent => ({
      ...torrent,
      _addedAt: previous.get(torrent.hash) ?? now,
    }));
    const sample = torrents.reduce((total, torrent) => ({
      down: total.down + (torrent.downloadSpeed || 0),
      up: total.up + (torrent.uploadSpeed || 0),
    }), { down: 0, up: 0 });
    return { connection: 'online', torrents, samples: [...state.samples.slice(-23), sample] };
  }),
  settings: {
    downloadPath: 'C:/Downloads',
    maxSpeed: 0,
    maxConnections: 200,
    maxActiveDownloads: 5,
    maxActiveSeeds: 10,
    listenPort: 6881,
    sslVerification: true,
    copyrightFilter: true,
    enabledSources: ['TSP:knaben', 'TSP:dmhy', 'TSP:rutor', 'TSP:torrentkitty', 'TSP:torrentscsv', 'TSP:torrentdownloads', 'TSP:1tamilmv-tamil', 'TSP:1tamilmv-hindi', 'TSP:1tamilmv-telugu', 'TSP:1tamilmv-malayalam', 'TSP:sukebei', 'TSP:nyaa', 'TSP:piratebay', 'TSP:yts', 'TSP:bitsearch', 'Bitsearch', 'YourBittorrent', 'TorrentFunk', 'The Pirate Bay', 'YTS', '1337x', 'Nyaa', 'LimeTorrents'],
  },
  ui: {
    sidebarCollapsed: false,
    activePage: 'dashboard',
    toasts: [],
    selectedTorrentHash: null,
    pendingSearch: '',
  },

  setTorrents: (torrents) => set({ torrents }),
  addTorrent: (torrent) => set((state) => {
    const exists = state.torrents.find(t => t.hash === torrent.hash);
    if (exists) {
      return {
        torrents: state.torrents.map(t => t.hash === torrent.hash ? { ...t, ...torrent } : t)
      };
    }
    return { torrents: [...state.torrents, torrent] };
  }),
  updateTorrent: (hash, updates) => set((state) => ({
    torrents: state.torrents.map(t => t.hash === hash ? { ...t, ...updates } : t)
  })),
  removeTorrent: (hash) => set((state) => ({
    torrents: state.torrents.filter(t => t.hash !== hash)
  })),
  clearCompleted: () => set((state) => ({
    torrents: state.torrents.filter(t => t.status !== 136)
  })),

  setSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings }
  })),
  updateSetting: (key, value) => set((state) => ({
    settings: { ...state.settings, [key]: value }
  })),

  toggleSidebar: () => set((state) => ({
    ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed }
  })),
  setActivePage: (page) => set((state) => ({
    ui: { ...state.ui, activePage: page }
  })),
  setSelectedTorrent: (hash) => set((state) => ({
    ui: { ...state.ui, selectedTorrentHash: hash }
  })),
  setPendingSearch: (query) => set((state) => ({
    ui: { ...state.ui, pendingSearch: query }
  })),

  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({
      ui: {
        ...state.ui,
        toasts: [...state.ui.toasts, { id, ...toast }]
      }
    }));
    setTimeout(() => {
      set((state) => ({
        ui: {
          ...state.ui,
          toasts: state.ui.toasts.filter(t => t.id !== id)
        }
      }));
    }, toast.duration || 4000);
  },
  removeToast: (id) => set((state) => ({
    ui: {
      ...state.ui,
      toasts: state.ui.toasts.filter(t => t.id !== id)
    }
  })),

  getTotalSpeed: () => {
    const { torrents } = get();
    return torrents.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0);
  },
  getActiveDownloads: () => {
    return get().torrents.filter(t => t.status === 201).length;
  },
}));

export default useAppStore;
