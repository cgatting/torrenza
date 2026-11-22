import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import useAppStore from '../store/useAppStore';
import { getDownloads, isHosted } from '../api/client';

const titles = { dashboard: 'Overview', search: 'Search', downloads: 'Downloads', settings: 'Settings' };

export default function AppShell({ children }) {
  const { ui, setActivePage, setPendingSearch, recordDownloads, setConnection } = useAppStore();
  const search = useRef(null);
  const main = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isHosted) {
      setConnection('hosted');
      return;
    }
    const controller = new AbortController();
    let timer;

    async function poll() {
      try {
        const { data } = await getDownloads(controller.signal);
        if (!controller.signal.aborted) recordDownloads(data.downloads || []);
      } catch {
        if (!controller.signal.aborted) setConnection('offline');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [recordDownloads, setConnection]);

  useEffect(() => {
    function focusSearch(event) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey ||
          event.target.closest?.('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      search.current?.focus();
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useEffect(() => { main.current?.scrollTo(0, 0); }, [ui.activePage]);

  function runSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setPendingSearch(query.trim());
    setActivePage('search');
    setQuery('');
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <Sidebar />
      <header className="workspace-header">
        <div className="workspace-breadcrumb"><span>Workspace</span><ChevronRight size={14} /> <strong>{titles[ui.activePage]}</strong></div>
        <form className="workspace-search" role="search" onSubmit={runSearch}>
          <Search size={16} />
          <input ref={search} value={query} onChange={event => setQuery(event.target.value)}
            aria-label="Quick search torrents" placeholder="Quick search" />
          <kbd>/</kbd>
        </form>
      </header>
      <main id="workspace-content" ref={main} className="workspace-main" tabIndex={-1}>
        <div className="workspace-content">{children}</div>
      </main>
    </div>
  );
}
