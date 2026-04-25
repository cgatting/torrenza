import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  torrents: [],
  settings: {
    downloadPath: 'C:/Downloads',
    maxSpeed: 0,
    maxConnections: 200,
    maxActiveDownloads: 5,
    maxActiveSeeds: 10,
    listenPort: 6881,
    sslVerification: true,
    copyrightFilter: true,
    enabledSources: ['1337x', 'Eztv', 'KickassTorrents', 'Limetorrents', 'Rarbg', 'ThePirateBay', 'Torrent9', 'TorrentProject', 'Torrentz2', 'Yts'],
  },
  ui: {
    sidebarCollapsed: false,
    activePage: 'dashboard',
    toasts: [],
    selectedTorrentHash: null,
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
