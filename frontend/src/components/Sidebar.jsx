import { createElement } from 'react';
import { Activity, ArrowDownToLine, LayoutDashboard, Search, Settings, Waves } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const navigation = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['search', 'Search', Search],
  ['downloads', 'Downloads', ArrowDownToLine],
  ['settings', 'Settings', Settings],
];

export default function Sidebar() {
  const { ui, setActivePage, connection, torrents } = useAppStore();
  const active = torrents.filter(torrent => torrent.status === 201).length;
  const labels = { connecting: 'Connecting', online: 'Connected', offline: 'Disconnected', hosted: 'External downloads' };

  return (
    <aside className="workspace-sidebar">
      <button className="workspace-brand" onClick={() => setActivePage('dashboard')} aria-label="Torrenza overview">
        <span className="brand-mark"><Waves size={22} /></span>
        <span>Torrenza<small>Torrent manager</small></span>
      </button>
      <nav className="workspace-nav" aria-label="Workspace">
        <span className="workspace-label">Workspace</span>
        {navigation.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActivePage(id)} aria-current={ui.activePage === id ? 'page' : undefined}>
            {createElement(Icon, { size: 19 })}<span>{label}</span>
            {id === 'downloads' && active > 0 && <small>{active}</small>}
          </button>
        ))}
      </nav>
      <div className="workspace-node">
        <Activity size={19} />
        <div><strong>{connection === 'hosted' ? 'Hosted workspace' : 'Local engine'}</strong>
          <small><i data-state={connection} />{labels[connection]}</small>
        </div>
      </div>
    </aside>
  );
}
