import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import useAppStore from '../store/useAppStore';
import { getDownloads, isHosted } from '../api/client';

const labels = {
  en: { titles: { dashboard: 'Overview', search: 'Search', downloads: 'Downloads', settings: 'Settings' }, workspace: 'Workspace', skip: 'Skip to content', quickSearch: 'Quick search torrents', quickPlaceholder: 'Quick search', switchLanguage: 'Switch language to German', alternateLanguage: 'Deutsch', country: 'United Kingdom', language: 'EN' },
  de: { titles: { dashboard: 'Übersicht', search: 'Suche', downloads: 'Downloads', settings: 'Einstellungen' }, workspace: 'Arbeitsbereich', skip: 'Zum Inhalt springen', quickSearch: 'Torrents schnell suchen', quickPlaceholder: 'Schnellsuche', switchLanguage: 'Sprache auf Englisch umstellen', alternateLanguage: 'English', country: 'Deutschland', language: 'DE' },
};

export default function AppShell({ children }) {
  const { ui, setActivePage, setPendingSearch, recordDownloads, setConnection } = useAppStore();
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);
  const copy = labels[language];
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
      <a className="skip-link" href="#workspace-content">{copy.skip}</a>
      <Sidebar />
      <header className="workspace-header">
        <div className="workspace-breadcrumb"><span>{copy.workspace}</span><ChevronRight size={14} /> <strong>{copy.titles[ui.activePage]}</strong></div>
        <form className="workspace-search" role="search" onSubmit={runSearch}>
          <Search size={16} />
          <input ref={search} value={query} onChange={event => setQuery(event.target.value)}
            aria-label={copy.quickSearch} placeholder={copy.quickPlaceholder} />
          <kbd>/</kbd>
        </form>
        <button className="language-switch" onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
          aria-label={copy.switchLanguage}
          title={`${copy.country} · ${copy.alternateLanguage}`}>
          <span className="language-flag" aria-hidden="true">{language === 'en' ? '🇬🇧' : '🇩🇪'}</span>
          <span>{copy.language}</span>
        </button>
      </header>
      <main id="workspace-content" ref={main} className="workspace-main" tabIndex={-1}>
        <div className="workspace-content">{children}</div>
      </main>
    </div>
  );
}
