import React, { useState, useEffect, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { getDownloads, stopDownload, startDownloadByHash, removeDownload } from '../api/client';

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
  if (status === 136) return { label: 'Seeding', color: 'bg-accent-cyan', textColor: 'text-accent-cyan', icon: '↑' };
  if (status === 32) return { label: 'Paused', color: 'bg-amber-400', textColor: 'text-amber-400', icon: '⏸' };
  if (status === 16) return { label: 'Error', color: 'bg-rose-400', textColor: 'text-rose-400', icon: '!' };
  return { label: 'Stopped', color: 'bg-gray-500', textColor: 'text-gray-400', icon: '⏹' };
}

function ProgressBar({ progress, color, status }) {
  const pct = Math.min(100, Math.max(0, progress));
  const isActive = status === 201;

  return (
    <div className="relative h-2 bg-surface rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isActive ? 'progress-stripes' : ''} ${color}`}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white drop-shadow-md" style={{ display: pct > 15 ? 'block' : 'none' }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function TorrentRow({ torrent, onPause, onResume, onRemove, isSelected, onSelect }) {
  const { name, size, progress, status, downloadSpeed, uploadSpeed, downloaded, uploaded, eta, seedsConnected, peersConnected } = torrent;
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusInfo(status);

  const etaDisplay = eta > 0 ? `${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m` : eta === 0 ? 'Complete' : '—';

  return (
    <div className={`card transition-all duration-200 ${isSelected ? 'border-border-active ring-1 ring-primary/20' : 'card-hover'}`}>
      <div className="flex items-start gap-4">
        <div
          className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer transition-all"
          onClick={() => onSelect(torrent.hash)}
        >
          {isSelected && <div className="w-3 h-3 rounded bg-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusInfo.color}`} />
              <h3 className="text-white font-semibold text-sm truncate">{name}</h3>
              <span className={`badge text-[10px] ${statusInfo.textColor.replace('text-', 'bg-')}/15 border ${statusInfo.textColor.replace('text-', 'border-')}/20`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {status === 201 ? (
                <button onClick={() => onPause(torrent)} className="btn-icon" title="Pause">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                </button>
              ) : (
                <button onClick={() => onResume(torrent)} className="btn-icon" title="Resume">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                </button>
              )}
              <button onClick={() => onRemove(torrent)} className="btn-icon text-rose-400/60 hover:text-rose-400" title="Remove">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" /></svg>
              </button>
            </div>
          </div>

          <ProgressBar progress={(progress || 0)} color={statusInfo.color} status={status} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 mt-3 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Size:</span>
              <span className="text-white font-medium">{formatBytes(downloaded)} / {formatBytes(size)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">↓</span>
              <span className={`font-medium ${downloadSpeed > 0 ? 'text-primary' : 'text-gray-500'}`}>{formatSpeed(downloadSpeed || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">↑</span>
              <span className={`font-medium ${uploadSpeed > 0 ? 'text-accent-purple' : 'text-gray-500'}`}>{formatSpeed(uploadSpeed || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">ETA:</span>
              <span className="text-white font-medium">{etaDisplay}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Seeds:</span>
              <span className="text-primary font-medium">{seedsConnected || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Peers:</span>
              <span className="text-rose-400 font-medium">{peersConnected || 0}</span>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-gray-500 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>Hash: <span className="text-gray-400 font-mono">{torrent.hash?.slice(0, 16)}...</span></div>
                <div>Ratio: <span className="text-gray-400">{(torrent.ratio || 0).toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? '▲ Less info' : '▼ More info'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  const { torrents, setTorrents, removeTorrent, clearCompleted, addToast } = useAppStore();
  const [selectedHashes, setSelectedHashes] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchDownloads = useCallback(async () => {
    try {
      const res = await getDownloads();
      const downloads = (res.data?.downloads || []).map(d => ({ ...d, _addedAt: Date.now() }));
      setTorrents(downloads);
    } catch (err) {
      console.error('Failed to fetch downloads', err);
    } finally {
      setLoading(false);
    }
  }, [setTorrents]);

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000);
    return () => clearInterval(interval);
  }, [fetchDownloads]);

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

  const handleSelect = useCallback((hash) => {
    setSelectedHashes(prev => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }, []);

  const activeCount = torrents.filter(t => t.status === 201).length;
  const seedingCount = torrents.filter(t => t.status === 136).length;
  const completedCount = torrents.filter(t => t.status === 136).length;
  const pausedCount = torrents.filter(t => t.status === 32).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Downloads</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your active downloads</p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => { torrents.filter(t => t.status === 136).forEach(t => handleRemove(t)); clearCompleted(); }}
            className="btn-secondary text-sm text-rose-400/60 hover:text-rose-400 border-rose-400/20"
            disabled={completedCount === 0}
          >
            Clear Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Downloading', count: activeCount, color: 'text-primary', icon: '↓' },
          { label: 'Seeding', count: seedingCount, color: 'text-accent-cyan', icon: '↑' },
          { label: 'Paused', count: pausedCount, color: 'text-amber-400', icon: '⏸' },
          { label: 'Completed', count: completedCount, color: 'text-gray-400', icon: '✓' },
        ].map(stat => (
          <div key={stat.label} className="card py-3 px-4 flex items-center gap-3">
            <span className="text-lg">{stat.icon}</span>
            <div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.count}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

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

      {!loading && torrents.length > 0 && (
        <div className="space-y-3">
          {torrents.map((torrent, idx) => (
            <div key={torrent.hash} style={{ animationDelay: `${idx * 30}ms` }}>
              <TorrentRow
                torrent={torrent}
                onPause={handlePause}
                onResume={handleResume}
                onRemove={handleRemove}
                isSelected={selectedHashes.has(torrent.hash)}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && torrents.length === 0 && (
        <div className="card text-center py-20">
          <div className="text-5xl mb-4">📥</div>
          <h3 className="text-lg font-semibold text-white mb-2">No downloads yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Search for torrents and click Download to get started. Your active downloads will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
