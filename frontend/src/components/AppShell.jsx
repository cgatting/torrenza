import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import useAppStore from '../store/useAppStore';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', section: 'Overview' },
  search: { title: 'Search', section: 'Library' },
  downloads: { title: 'Downloads', section: 'Library' },
  settings: { title: 'Settings', section: 'System' },
};

export default function AppShell({ children }) {
  const { ui, setActivePage, setPendingSearch } = useAppStore();
  const { sidebarCollapsed, activePage } = ui;
  const searchRef = useRef(null);
  const [quickQuery, setQuickQuery] = React.useState('');
  const page = PAGE_TITLES[activePage] || PAGE_TITLES.search;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setActivePage('search');
        setTimeout(() => searchRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActivePage]);

  const runQuickSearch = (e) => {
    e.preventDefault();
    const query = quickQuery.trim();
    if (!query) return;
    setPendingSearch(query);
    setQuickQuery('');
    setActivePage('search');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />

      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '264px' }}
      >
        <header className="h-[76px] bg-elevated/60 backdrop-blur-xl border-b border-border flex items-center justify-between px-8 gap-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-500">{page.section}</span>
            <svg className="text-gray-600 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6" />
            </svg>
            <span className="text-white font-semibold truncate">{page.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <form
              onSubmit={runQuickSearch}
              className="hidden md:flex items-center gap-2 w-72 bg-surface/80 border border-border rounded-xl px-3.5 py-2 text-sm text-gray-500 hover:border-border-active/50 transition-colors group"
            >
              <svg className="flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={quickQuery}
                onChange={e => setQuickQuery(e.target.value)}
                onFocus={() => setActivePage('search')}
                placeholder="Quick search torrents…"
                className="flex-1 min-w-0 bg-transparent outline-none placeholder-gray-500 text-gray-200"
              />
              <span className="kbd group-hover:border-border-active/40">/</span>
            </form>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </div>
                <span className="hidden sm:inline text-[11px] text-gray-400 font-semibold tracking-wider">NODE ONLINE</span>
              </div>

              <div className="h-6 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f2ae6d] to-[#d96b68] flex items-center justify-center text-xs font-bold text-white shadow-md shadow-orange-950/30">
                  TZ
                </div>
                <div className="hidden lg:block leading-tight">
                  <div className="text-xs font-semibold text-white">Local Node</div>
                  <div className="text-[10px] text-gray-500">127.0.0.1:5000</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
