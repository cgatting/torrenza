import { createElement } from 'react';
import { Activity, ArrowDownToLine, LayoutDashboard, Search, Settings, Waves } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const translations = {
  en: { overview: 'Overview', search: 'Search', downloads: 'Downloads', settings: 'Settings', workspace: 'Workspace', hosted: 'Hosted workspace', engine: 'Local engine', connecting: 'Connecting', online: 'Connected', offline: 'Disconnected', external: 'External downloads', subtitle: 'Torrent manager' },
  de: { overview: 'Übersicht', search: 'Suche', downloads: 'Downloads', settings: 'Einstellungen', workspace: 'Arbeitsbereich', hosted: 'Gehosteter Bereich', engine: 'Lokaler Client', connecting: 'Verbindung wird hergestellt', online: 'Verbunden', offline: 'Getrennt', external: 'Externe Downloads', subtitle: 'Torrent-Verwaltung' },
};

export default function Sidebar() {
  const { ui, setActivePage, connection, torrents, language } = useAppStore();
  const text = translations[language];
  const navigation = [
    ['dashboard', text.overview, LayoutDashboard],
    ['search', text.search, Search],
    ['downloads', text.downloads, ArrowDownToLine],
    ['settings', text.settings, Settings],
  ];
  const active = torrents.filter(torrent => torrent.status === 201).length;

  return (
    <aside className="workspace-sidebar">
      <button className="workspace-brand" onClick={() => setActivePage('dashboard')} aria-label={`Torrenza ${text.overview}`}>
        <span className="brand-mark"><Waves size={22} /></span>
        <span>Torrenza<small>{text.subtitle}</small></span>
      </button>
      <nav className="workspace-nav" aria-label={text.workspace}>
        <span className="workspace-label">{text.workspace}</span>
        {navigation.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActivePage(id)} aria-current={ui.activePage === id ? 'page' : undefined}>
            {createElement(Icon, { size: 19 })}<span>{label}</span>
            {id === 'downloads' && active > 0 && <small>{active}</small>}
          </button>
        ))}
      </nav>
      <div className="workspace-node">
        <Activity size={19} />
        <div><strong>{connection === 'hosted' ? text.hosted : text.engine}</strong>
          <small><i data-state={connection} />{{ connecting: text.connecting, online: text.online, offline: text.offline, hosted: text.external }[connection]}</small>
        </div>
      </div>
    </aside>
  );
}
