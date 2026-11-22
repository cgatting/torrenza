import React, { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { getDownloads, getSystemDrives } from '../api/client';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card card-hover animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function SpeedBar({ current, max, label, color, icon }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <span className="font-medium text-gray-200">{current.toFixed(1)} MB/s</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, current > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { torrents, setTorrents } = useAppStore();
  const [drives, setDrives] = useState([]);
  const [speedHistory, setSpeedHistory] = useState(Array(24).fill(0));

  useEffect(() => {
    getSystemDrives().then(r => setDrives(r.data.drives || [])).catch(() => {});
    getDownloads().then(r => setTorrents((r.data?.downloads || []).map(d => ({ ...d, _addedAt: Date.now() })))).catch(() => {});
  }, [setTorrents]);

  const speedKey = torrents.map(t => `${t.downloadSpeed}|${t.uploadSpeed}`).join(',');
  useEffect(() => {
    const totalDown = torrents.reduce((s, t) => s + (t.downloadSpeed || 0), 0) / (1024 * 1024);
    const totalUp = torrents.reduce((s, t) => s + (t.uploadSpeed || 0), 0) / (1024 * 1024);
    const id = setTimeout(() => {
      setSpeedHistory(prev => [...prev.slice(1), { down: totalDown, up: totalUp }]);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedKey]);

  const activeCount = torrents.filter(t => t.status === 201).length;
  const seedingCount = torrents.filter(t => t.status === 136).length;
  const totalDownloaded = torrents.reduce((s, t) => s + (t.downloaded || 0), 0) / (1024 ** 3);
  const totalUploaded = torrents.reduce((s, t) => s + (t.uploaded || 0), 0) / (1024 ** 3);
  const totalSize = drives.reduce((s, d) => s + (d.totalSpace || 0), 0) / (1024 ** 3);
  const freeSize = drives.reduce((s, d) => s + (d.freeSpace || 0), 0) / (1024 ** 3);
  const maxDown = Math.max(...speedHistory.map(s => s.down), 1);
  const maxUp = Math.max(...speedHistory.map(s => s.up), 1);

  const recentTorrents = [...torrents]
    .sort((a, b) => (b._addedAt || 0) - (a._addedAt || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label mb-2">Overview</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">A live pulse check on files, bandwidth, and storage.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-green">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          color="bg-primary/12 text-primary"
          label="Active Downloads"
          value={activeCount}
          sub={activeCount > 0 ? 'Downloading right now' : 'Nothing active'}
          icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <StatCard
          color="bg-accent-cyan/12 text-accent-cyan"
          label="Total Downloaded"
          value={`${totalDownloaded.toFixed(1)} GB`}
          sub="Across all torrents"
          icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          }
        />
        <StatCard
          color="bg-emerald-400/12 text-emerald-400"
          label="Seeding"
          value={seedingCount}
          sub={`${totalUploaded.toFixed(1)} GB uploaded`}
          icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
        />
        <StatCard
          color="bg-accent-amber/12 text-accent-amber"
          label="Storage Used"
          value={`${((totalSize - freeSize) / Math.max(totalSize, 1) * 100).toFixed(0)}%`}
          sub={`${freeSize.toFixed(0)} GB free`}
          icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Bandwidth</h3>
              <p className="text-xs text-gray-500 mt-0.5">Real-time throughput over the last 24 polls</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary/70" /> Down
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent-purple/70" /> Up
              </span>
            </div>
          </div>

          <div className="flex gap-[3px] items-end h-24 mb-4">
            {speedHistory.map((s, i) => {
              const maxVal = Math.max(maxDown, maxUp, 0.1);
              const h1 = (s.down / maxVal) * 100;
              const h2 = (s.up / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex gap-[2px] items-end group">
                  <div
                    className="flex-1 bg-gradient-to-t from-primary/30 to-primary/80 rounded-t transition-all duration-300 group-hover:from-primary/50 group-hover:to-primary"
                    style={{ height: `${Math.max(h1, 2)}px` }}
                  />
                  <div
                    className="flex-1 bg-gradient-to-t from-accent-purple/30 to-accent-purple/80 rounded-t transition-all duration-300 group-hover:from-accent-purple/50 group-hover:to-accent-purple"
                    style={{ height: `${Math.max(h2, 2)}px` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <SpeedBar
              label="Download"
              current={speedHistory[speedHistory.length - 1]?.down || 0}
              max={maxDown}
              color="bg-gradient-to-r from-primary to-[#f2ae6d]"
              icon={<span className="text-primary">↓</span>}
            />
            <SpeedBar
              label="Upload"
              current={speedHistory[speedHistory.length - 1]?.up || 0}
              max={maxUp}
              color="bg-gradient-to-r from-accent-purple to-[#c084fc]"
              icon={<span className="text-accent-purple">↑</span>}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Downloads</h3>
          {recentTorrents.length > 0 ? (
            <div className="space-y-1">
              {recentTorrents.map((t) => (
                <div key={t.hash} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.status === 201 ? 'bg-primary animate-pulse' :
                    t.status === 136 ? 'bg-emerald-400' :
                    t.status === 32 ? 'bg-amber-400' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.status === 201 ? 'Downloading' : t.status === 136 ? 'Seeding' : 'Paused'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">{(t.progress || 0).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 text-sm">
              No recent downloads yet
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Storage Drives</h3>
            <p className="text-xs text-gray-500 mt-0.5">Capacity and free space across detected volumes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drives.length > 0 ? drives.map((drive, i) => {
            const usedPct = drive.totalSpace > 0 ? ((drive.totalSpace - drive.freeSpace) / drive.totalSpace) * 100 : 0;
            const freeGB = drive.freeSpace / (1024 ** 3);
            const totalGB = drive.totalSpace / (1024 ** 3);
            return (
              <div key={i} className="bg-surface/80 rounded-xl p-4 border border-border hover:border-border-active/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <span className="font-semibold text-white">{drive.letter || `Drive ${i + 1}`}</span>
                  </div>
                  <span className="text-xs text-gray-400">{freeGB.toFixed(1)} GB free</span>
                </div>
                <div className="h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${usedPct > 90 ? 'bg-rose-500' : usedPct > 70 ? 'bg-amber-400' : 'bg-gradient-to-r from-primary to-[#f2ae6d]'}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{usedPct.toFixed(1)}% used</span>
                  <span>{totalGB.toFixed(1)} GB total</span>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-6 text-gray-500 text-sm">
              No drives detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
