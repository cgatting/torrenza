import { useState, useCallback } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import useAppStore from '../store/useAppStore';
import { stopDownload, startDownloadByHash, removeDownload, openDownloadInExplorer, isHosted } from '../api/client';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
  return formatBytes(bytesPerSec) + '/s';
}

function getStatusInfo(status) {
  if (status === 201) return { label: 'Downloading', color: 'bg-primary', textColor: 'text-primary', icon: '↓' };
  if (status === 136) return { label: 'Seeding', color: 'bg-emerald-400', textColor: 'text-emerald-700', icon: '↑' };
  if (status === 32) return { label: 'Paused', color: 'bg-amber-400', textColor: 'text-amber-800', icon: '⏸' };
  if (status === 16) return { label: 'Error', color: 'bg-rose-400', textColor: 'text-rose-700', icon: '!' };
  return { label: 'Stopped', color: 'bg-gray-500', textColor: 'text-gray-400', icon: '⏹' };
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'downloading', label: 'Downloading' },
  { id: 'seeding', label: 'Seeding' },
  { id: 'paused', label: 'Paused' },

];

function ProgressBar({ progress, color }) {
  const percent = Math.min(100, Math.max(0, progress));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface" role="progressbar"
        aria-label="Transfer progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{percent.toFixed(0)}%</span>
    </div>
  );
}

function TorrentRow({ torrent, onPause, onResume, onRemove, onOpenExplorer, onCopyMagnet, isSelected, onSelect }) {
  const { name, size, progress, status, downloadSpeed, uploadSpeed, downloaded, uploaded, eta, seedsConnected, peersConnected } = torrent;
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusInfo(status);

  const etaDisplay = eta > 0 ? `${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m` : eta === 0 ? 'Complete' : '—';

  const stats = [
    { label: 'Size', value: `${formatBytes(downloaded)} / ${formatBytes(size)}`, valueClass: 'text-ink' },
    { label: 'Download', value: formatSpeed(downloadSpeed || 0), valueClass: downloadSpeed > 0 ? 'text-primary' : 'text-gray-500', icon: '↓' },
    { label: 'Upload', value: formatSpeed(uploadSpeed || 0), valueClass: uploadSpeed > 0 ? 'text-accent-purple' : 'text-gray-500', icon: '↑' },
    { label: 'ETA', value: etaDisplay, valueClass: 'text-ink' },
    { label: 'Seeds', value: `${seedsConnected || 0}`, valueClass: 'text-emerald-700' },
    { label: 'Peers', value: `${peersConnected || 0}`, valueClass: 'text-rose-700' },
  ];

  return (
    <div className={`card transition-all duration-200 ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'card-hover'}`}>
      <div className="flex items-start gap-4">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(torrent.hash)}
          aria-label={`Select ${name}`} className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary" />

        <div className="flex-1 min-w-0">
          <div className="transfer-summary flex items-start justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusInfo.color}`} />
              <h3 className="text-ink font-semibold text-sm truncate" title={name}>{name}</h3>
              <span className={`badge text-[10px] ${statusInfo.color}/15 border ${statusInfo.color.replace('bg-', 'border-')}/25 ${statusInfo.textColor}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {torrent.downloadUrl && (
                <button onClick={() => onCopyMagnet(torrent)} className="btn-icon" title="Copy magnet link" aria-label="Copy magnet link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
              )}
              {status === 136 && (
                <button onClick={() => onOpenExplorer(torrent)} className="btn-icon text-primary hover:text-ink" title="Open in File Explorer" aria-label="Open in File Explorer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
              {status === 201 ? (
                <button onClick={() => onPause(torrent)} className="btn-icon" title="Pause">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                </button>
              ) : (
                <button onClick={() => onResume(torrent)} className="btn-icon" title="Resume">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                </button>
              )}
              <button onClick={() => onRemove(torrent)} className="btn-icon text-rose-700/60 hover:text-rose-700" title="Remove">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" /></svg>
              </button>
            </div>
          </div>

          <ProgressBar progress={(progress || 0)} color={statusInfo.color} />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-2 gap-x-3 mt-3 text-xs">
            {stats.map(stat => (
              <div key={stat.label} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-gray-600">{stat.label}</span>
                <span className={`font-medium truncate ${stat.valueClass}`}>
                  {stat.icon && <span className="mr-1">{stat.icon}</span>}
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-gray-500 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>Hash: <span className="text-gray-400 font-mono">{torrent.hash?.slice(0, 16)}...</span></div>
                <div>Ratio: <span className="text-gray-400">{(torrent.ratio || 0).toFixed(2)}</span></div>
                <div>Uploaded: <span className="text-gray-400">{formatBytes(uploaded || 0)}</span></div>
                <div>Save path: <span className="text-gray-400 truncate">{torrent.savePath || '—'}</span></div>
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-2 text-xs text-gray-500 hover:text-ink transition-colors"
          >
            {expanded ? '▲ Less info' : '▼ More info'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  const { torrents, connection, removeTorrent, addToast, setActivePage } = useAppStore();
  const [selectedHashes, setSelectedHashes] = useState(new Set());
  const loading = connection === 'connecting';
  const [activeTab, setActiveTab] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState('progress');

  const activeCount = torrents.filter(t => t.status === 201).length;
  const seedingCount = torrents.filter(t => t.status === 136).length;
  const completedCount = torrents.filter(t => t.status === 136).length;
  const pausedCount = torrents.filter(t => t.status === 32).length;
  const totalSpeedDown = torrents.reduce((s, t) => s + (t.downloadSpeed || 0), 0);
  const totalSpeedUp = torrents.reduce((s, t) => s + (t.uploadSpeed || 0), 0);

  const filtered = [...torrents]
    .filter(t => {
      if (activeTab === 'downloading' && t.status !== 201) return false;
      if (activeTab === 'seeding' && t.status !== 136) return false;
      if (activeTab === 'paused' && t.status !== 32) return false;

      if (filterQuery && !t.name.toLowerCase().includes(filterQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'speed':
          return (b.downloadSpeed || 0) - (a.downloadSpeed || 0);
        case 'progress':
        default:
          return (b.progress || 0) - (a.progress || 0);
      }
    });

  const tabCounts = {
    all: torrents.length,
    downloading: activeCount,
    seeding: seedingCount,
    paused: pausedCount,

  };

  const handleCopyMagnet = useCallback(async (torrent) => {
    try {
      await navigator.clipboard.writeText(torrent.downloadUrl || '');
      addToast({ type: 'success', message: 'Magnet link copied to clipboard' });
    } catch {
      addToast({ type: 'error', message: 'Could not copy magnet link' });
    }
  }, [addToast]);



  const handlePause = useCallback(async (torrent) => {
    try {
      await stopDownload(torrent.hash);
      addToast({ type: 'info', message: `Paused: ${torrent.name.slice(0, 40)}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to pause torrent' });
    }
  }, [addToast]);

  const handleResume = useCallback(async (torrent) => {
    try {
      await startDownloadByHash(torrent.hash);
      addToast({ type: 'success', message: `Resumed: ${torrent.name.slice(0, 40)}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to resume torrent' });
    }
  }, [addToast]);

  const handleRemove = useCallback(async (torrent) => {
    if (!window.confirm(`Remove "${torrent.name}"?`)) return;
    try {
      await removeDownload(torrent.hash);
      removeTorrent(torrent.hash);
      addToast({ type: 'info', message: `Removed: ${torrent.name.slice(0, 40)}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove torrent' });
    }
  }, [removeTorrent, addToast]);

  const handleOpenExplorer = useCallback(async (torrent) => {
    try {
      await openDownloadInExplorer(torrent.hash);
      addToast({ type: 'success', message: 'Opened in File Explorer' });
    } catch {
      addToast({ type: 'error', message: 'Could not open the download folder' });
    }
  }, [addToast]);

  const handleSelect = useCallback((hash) => {
    setSelectedHashes(prev => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedHashes(prev => {
      const next = new Set(prev);
      const allVisibleSelected = filtered.every(torrent => next.has(torrent.hash));
      for (const torrent of filtered) {
        if (allVisibleSelected) next.delete(torrent.hash);
        else next.add(torrent.hash);
      }
      return next;
    });
  }, [filtered]);

  const handleBulkPause = useCallback(async () => {
    const targets = torrents.filter(t => selectedHashes.has(t.hash) && t.status === 201);
    for (const t of targets) await handlePause(t);
    setSelectedHashes(new Set());
  }, [torrents, selectedHashes, handlePause]);

  const handleBulkResume = useCallback(async () => {
    const targets = torrents.filter(t => selectedHashes.has(t.hash) && t.status !== 201 && t.status !== 136);
    for (const t of targets) await handleResume(t);
    setSelectedHashes(new Set());
  }, [torrents, selectedHashes, handleResume]);

  const handleBulkRemove = useCallback(async (targets = torrents.filter(t => selectedHashes.has(t.hash))) => {
    if (!targets.length) return;
    if (!window.confirm(`Remove ${targets.length} selected download(s)?`)) return;
    let removed = 0;
    for (const t of targets) {
      try {
        await removeDownload(t.hash);
        removeTorrent(t.hash);
        removed += 1;
      } catch {
        addToast({ type: 'error', message: `Failed to remove: ${t.name.slice(0, 30)}` });
      }
    }
    if (removed) addToast({ type: 'info', message: `Removed ${removed} download(s)` });
    setSelectedHashes(new Set());
  }, [torrents, selectedHashes, removeTorrent, addToast]);

  if (isHosted) return <>
    <PageHeader title="Downloads" />
    <section className="card hosted-panel mt-6">
      <span className="metric-icon violet"><ArrowDownToLine size={20} /></span>
      <h2>Downloads run on your device</h2>
      <p>Open a magnet link from Search to manage the transfer in your installed torrent client.</p>
      <button className="btn-primary" onClick={() => setActivePage('search')}>Find torrents</button>
    </section>
  </>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Downloads" description="Monitor and manage your torrent queue.">
          <button
            onClick={() => torrents.filter(t => t.status === 201).forEach(t => handlePause(t))}
            className="btn-secondary text-sm"
            disabled={activeCount === 0}
          >
            Pause All
          </button>
          <button
            onClick={() => torrents.filter(t => t.status === 32).forEach(t => handleResume(t))}
            className="btn-secondary text-sm"
            disabled={pausedCount === 0}
          >
            Resume All
          </button>
          <button
            onClick={() => handleBulkRemove(torrents.filter(t => t.status === 136))}
            className="btn-secondary text-sm text-rose-700/70 hover:text-rose-700 border-rose-400/20"
            disabled={completedCount === 0}
          >
            Clear Completed
          </button>
      </PageHeader>

      {connection === 'offline' && (
        <div className="notice" role="status">The local engine is disconnected. Transfer details may be out of date.</div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-none">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-1">Downloading</div>
          </div>
        </div>
        <div className="card py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/12 text-emerald-700 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5" />
              <polyline points="5,12 12,5 19,12" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-none">{seedingCount}</div>
            <div className="text-xs text-gray-500 mt-1">Seeding</div>
          </div>
        </div>
        <div className="card py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/12 text-accent-purple flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-ink leading-none">{formatSpeed(totalSpeedDown)} <span className="text-gray-500 font-medium text-xs">↓</span> {formatSpeed(totalSpeedUp)} <span className="text-gray-500 font-medium text-xs">↑</span></div>
            <div className="text-xs text-gray-500 mt-1">Aggregate speed</div>
          </div>
        </div>
        <div className="card py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/12 text-amber-800 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-none">{pausedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Paused</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex max-w-full flex-wrap items-center gap-1 bg-elevated border border-border rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-gray-400 hover:text-ink hover:bg-surface'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-70">{tabCounts[tab.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border bg-surface accent-primary cursor-pointer"
                checked={filtered.length > 0 && filtered.every(torrent => selectedHashes.has(torrent.hash))}
                onChange={handleSelectAll}
                disabled={filtered.length === 0}
              />
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                Select all {selectedHashes.size > 0 && `(${selectedHashes.size})`}
              </span>
            </label>
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            title="Sort downloads"
          >
            <option value="progress">Sort: Progress</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="speed">Sort: Speed</option>
          </select>

          <div className="relative w-64 max-w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              aria-label="Filter downloads"
              placeholder="Filter downloads…"
              className="input pl-9 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {selectedHashes.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 animate-fade-in">
          <div className="text-sm text-ink font-medium">
            {selectedHashes.size} selected
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkResume} className="btn-secondary text-xs px-3 py-2">
              Resume
            </button>
            <button onClick={handleBulkPause} className="btn-secondary text-xs px-3 py-2">
              Pause
            </button>
            <button onClick={() => handleBulkRemove()} className="btn-secondary text-xs px-3 py-2 text-rose-700/80 hover:text-rose-700 border-rose-400/20">
              Remove
            </button>
            <button onClick={() => setSelectedHashes(new Set())} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-4">
                <div className="w-5 h-5 bg-surface rounded" />
                <div className="flex-1">
                  <div className="h-5 bg-surface rounded w-1/2 mb-3" />
                  <div className="h-2 bg-surface rounded mb-3" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-surface rounded w-24" />
                    <div className="h-3 bg-surface rounded w-24" />
                    <div className="h-3 bg-surface rounded w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((torrent, idx) => (
            <div key={torrent.hash} style={{ animationDelay: `${idx * 30}ms` }}>
              <TorrentRow
                torrent={torrent}
                onPause={handlePause}
                onResume={handleResume}
                onRemove={handleRemove}
                onOpenExplorer={handleOpenExplorer}
                onCopyMagnet={handleCopyMagnet}
                isSelected={selectedHashes.has(torrent.hash)}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && torrents.length > 0 && filtered.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">🗂</div>
          <h3 className="text-md font-semibold text-ink mb-1">Nothing matches this view</h3>
          <p className="text-gray-400 text-sm">Try a different tab or clear the filter.</p>
        </div>
      )}

      {!loading && torrents.length === 0 && (
        <div className="card search-empty">
          <span className="metric-icon"><ArrowDownToLine size={23} /></span>
          <h2>{connection === 'offline' ? 'Queue unavailable' : 'No downloads yet'}</h2>
          {connection !== 'offline' && <p>Find a torrent and start it to add it to your queue.</p>}
          <button className="btn-secondary mt-1" onClick={() => setActivePage('search')}>Find torrents</button>
        </div>
      )}
    </div>
  );
}
