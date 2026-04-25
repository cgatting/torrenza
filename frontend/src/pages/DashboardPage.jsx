import React, { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { getDownloads, getSystemDrives } from '../api/client';

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="card card-hover animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-primary' : 'text-rose-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function SpeedBar({ current, max, label, color }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{current.toFixed(1)} MB/s</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { torrents } = useAppStore();
  const [drives, setDrives] = useState([]);
  const [speedHistory, setSpeedHistory] = useState(Array(20).fill(0));

  useEffect(() => {
    getSystemDrives().then(r => setDrives(r.data.drives || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const totalDown = torrents.reduce((s, t) => s + (t.downloadSpeed || 0), 0) / (1024 * 1024);
    const totalUp = torrents.reduce((s, t) => s + (t.uploadSpeed || 0), 0) / (1024 * 1024);
    setSpeedHistory(prev => [...prev.slice(1), { down: totalDown, up: totalUp }]);
  }, [torrents]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Overview of your downloads and system</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Magnet Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          color="bg-primary/15 text-primary"
          label="Active Downloads"
          value={activeCount}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <StatCard
          color="bg-accent-cyan/15 text-accent-cyan"
          label="Total Downloaded"
          value={`${totalDownloaded.toFixed(1)} GB`}
          sub="Across all torrents"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          }
        />
        <StatCard
          color="bg-accent-purple/15 text-accent-purple"
          label="Seeding"
          value={seedingCount}
          sub={`${totalUploaded.toFixed(1)} GB uploaded`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
        />
        <StatCard
          color="bg-accent-amber/15 text-accent-amber"
          label="Storage Used"
          value={`${((totalSize - freeSize) / Math.max(totalSize, 1) * 100).toFixed(0)}%`}
          sub={`${freeSize.toFixed(0)} GB free`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-4">Bandwidth</h3>
          <div className="space-y-4">
            <SpeedBar
              label="Download"
              current={speedHistory[speedHistory.length - 1]?.down || 0}
              max={maxDown}
              color="bg-primary"
            />
            <SpeedBar
              label="Upload"
              current={speedHistory[speedHistory.length - 1]?.up || 0}
              max={maxUp}
              color="bg-accent-purple"
            />
          </div>
          <div className="mt-5">
            <div className="flex gap-1 items-end h-20">
              {speedHistory.map((s, i) => {
                const maxVal = Math.max(maxDown, maxUp, 0.1);
                const h1 = (s.down / maxVal) * 80;
                const h2 = (s.up / maxVal) * 80;
                return (
                  <div key={i} className="flex-1 flex gap-[2px] items-end">
                    <div
                      className="flex-1 bg-primary/60 rounded-t transition-all duration-200"
                      style={{ height: `${Math.max(h1, 2)}px` }}
                    />
                    <div
                      className="flex-1 bg-accent-purple/60 rounded-t transition-all duration-200"
                      style={{ height: `${Math.max(h2, 2)}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-primary/60" /> Download
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-accent-purple/60" /> Upload
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Downloads</h3>
          {recentTorrents.length > 0 ? (
            <div className="space-y-3">
              {recentTorrents.map((t) => (
                <div key={t.hash} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.status === 201 ? 'bg-primary' :
                    t.status === 136 ? 'bg-accent-cyan' :
                    t.status === 32 ? 'bg-amber-400' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.status === 201 ? 'Downloading' : t.status === 136 ? 'Seeding' : 'Paused'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{(t.progress || 0).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No recent downloads
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Storage Drives</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drives.length > 0 ? drives.map((drive, i) => {
            const usedPct = drive.totalSpace > 0 ? ((drive.totalSpace - drive.freeSpace) / drive.totalSpace) * 100 : 0;
            return (
              <div key={i} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className="font-semibold text-white">{drive.letter || `Drive ${i + 1}`}</span>
                  </div>
                  <span className="text-xs text-gray-400">{(drive.freeSpace / (1024 ** 3)).toFixed(1)} GB free</span>
                </div>
                <div className="h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usedPct > 90 ? 'bg-rose-500' : usedPct > 70 ? 'bg-amber-400' : 'bg-primary'}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {(drive.totalSpace / (1024 ** 3)).toFixed(1)} GB total
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
