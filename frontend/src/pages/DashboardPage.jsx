import { createElement, useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowDownToLine, ArrowRight, ArrowUp, Database, HardDrive, Radio, Search } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getSystemDrives, isHosted } from '../api/client';
import PageHeader from '../components/PageHeader';

const statuses = { 201: 'Downloading', 136: 'Seeding', 32: 'Paused' };

function formatBytes(bytes = 0) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const unit = Math.min(units.length - 1, Math.floor(Math.log2(Math.max(1, bytes)) / 10));
  return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function Bandwidth({ samples, online }) {
  const latest = online ? samples.at(-1) : null;
  const scale = Math.max(1, ...samples.flatMap(sample => [sample.down, sample.up]));
  return (
    <section className="bandwidth" aria-labelledby="bandwidth-heading">
      <div className="panel-heading">
        <div><h2 id="bandwidth-heading">Bandwidth</h2><p>Last 24 transfer samples</p></div>
        <span className="bandwidth-status"><i data-state={online ? 'online' : 'offline'} />{latest ? 'Live' : 'Unavailable'}</span>
      </div>
      <div className="bandwidth-rates">
        <div><span><ArrowDown size={14} /> Download</span><strong>{latest ? `${formatBytes(latest.down)}/s` : '—'}</strong></div>
        <div><span><ArrowUp size={14} /> Upload</span><strong>{latest ? `${formatBytes(latest.up)}/s` : '—'}</strong></div>
      </div>
      <div className="bandwidth-chart" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => {
          const sample = samples[index - (24 - samples.length)];
          return <div className="chart-pair" key={index}>
            <i style={{ height: sample ? `${Math.max(2, sample.down / scale * 100)}%` : 0 }} />
            <i style={{ height: sample ? `${Math.max(2, sample.up / scale * 100)}%` : 0 }} />
          </div>;
        })}
      </div>
      <div className="chart-axis"><span>Earlier</span><span>Latest sample</span></div>
    </section>
  );
}

export default function DashboardPage() {
  const { torrents, connection, samples, setActivePage } = useAppStore();
  const [drives, setDrives] = useState(null);
  const online = connection === 'online';

  useEffect(() => {
    if (!online) return;
    let current = true;
    getSystemDrives().then(({ data }) => {
      if (current) setDrives(data.drives || []);
    }).catch(() => {
      if (current) setDrives(false);
    });
    return () => { current = false; };
  }, [online]);

  const downloaded = torrents.reduce((sum, torrent) => sum + (torrent.downloaded || 0), 0);
  const uploaded = torrents.reduce((sum, torrent) => sum + (torrent.uploaded || 0), 0);
  const total = (drives || []).reduce((sum, drive) => sum + (drive.totalSpace || 0), 0);
  const free = (drives || []).reduce((sum, drive) => sum + (drive.freeSpace || 0), 0);
  const recent = [...torrents].sort((a, b) => b._addedAt - a._addedAt).slice(0, 4);
  const metrics = [
    [ArrowDownToLine, 'Active downloads', torrents.filter(t => t.status === 201).length, 'Currently transferring', 'violet'],
    [Database, 'Downloaded', formatBytes(downloaded), 'Across the current queue', 'blue'],
    [Radio, 'Seeding', torrents.filter(t => t.status === 136).length, online ? `${formatBytes(uploaded)} uploaded` : 'Upload total unavailable', 'green'],
    [HardDrive, 'Storage used', total ? `${Math.round((total - free) / total * 100)}%` : '—', online && total ? `${formatBytes(free)} free` : 'Capacity unavailable', 'amber'],
  ];

  return (
    <div className="dashboard">
      <PageHeader title="Overview" description="Monitor transfers, bandwidth, and local storage.">
        <button className="btn-primary" onClick={() => setActivePage('search')}><Search size={17} /> Find torrents</button>
      </PageHeader>
      {isHosted ? (
        <section className="card hosted-panel">
          <span className="metric-icon violet"><ArrowDownToLine size={20} /></span>
          <h2>Downloads run on your device</h2>
          <p>Find a torrent in Torrenza and open its magnet link with your installed torrent client.</p>
          <a className="btn-secondary" href="https://www.qbittorrent.org/download" target="_blank" rel="noreferrer">Get qBittorrent <ArrowRight size={16} /></a>
        </section>
      ) : (
        <>
          <div className="metric-grid">
            {metrics.map(([Icon, label, value, detail, tone]) => <div className="metric card" key={label}>
              <span className={`metric-icon ${tone}`}>{createElement(Icon, { size: 18 })}</span>
              <span className="metric-label">{label}</span><strong>{online ? value : '—'}</strong><small>{detail}</small>
            </div>)}
          </div>

          <div className="overview-grid">
            <Bandwidth samples={samples} online={online} />
            <section className="card recent-panel" aria-labelledby="recent-heading">
              <div className="panel-heading">
                <div><h2 id="recent-heading">Recent downloads</h2><p>Your latest transfers</p></div>
                <button className="btn-icon" aria-label="Open downloads" onClick={() => setActivePage('downloads')}><ArrowRight size={18} /></button>
              </div>
              {recent.length ? <ul className="recent-list">{recent.map(torrent => (
                <li key={torrent.hash}>
                  <span className="metric-icon violet"><ArrowDownToLine size={15} /></span>
                  <div><strong title={torrent.name}>{torrent.name}</strong><small>{statuses[torrent.status] || 'Waiting'}</small></div>
                  <span>{Math.round(torrent.progress || 0)}%</span>
                </li>
              ))}</ul> : (
                <div className="recent-empty">
                  <span className="metric-icon violet"><Activity size={22} /></span>
                  <strong>{online ? 'No downloads yet' : connection === 'connecting' ? 'Connecting to the engine' : 'Engine disconnected'}</strong>
                  <p>{online ? 'Torrents you start will appear here.' : 'Transfer activity appears when the engine is connected.'}</p>
                </div>
              )}
            </section>
          </div>

          <section className="card storage-panel" aria-labelledby="storage-heading">
            <div className="panel-heading"><div><h2 id="storage-heading">Storage drives</h2><p>Capacity across detected volumes</p></div><HardDrive size={20} /></div>
            {online && drives?.length ? (
              <ul className="drive-grid">{drives.map((drive, index) => {
                const used = drive.totalSpace ? Math.min(100, Math.max(0, (drive.totalSpace - drive.freeSpace) / drive.totalSpace * 100)) : 0;
                const name = drive.letter || `Drive ${index + 1}`;
                return <li key={name}>
                  <div><strong>{name}</strong><span>{formatBytes(drive.freeSpace)} free</span></div>
                  <progress aria-label={`${name} space used`} max={100} value={used} />
                  <small>{formatBytes(drive.totalSpace)} total</small>
                </li>;
              })}</ul>
            ) : <p className="storage-empty">{!online || drives === false ? 'Storage information unavailable.' : drives ? 'No drives detected.' : 'Checking storage…'}</p>}
          </section>
        </>
      )}
    </div>
  );
}
