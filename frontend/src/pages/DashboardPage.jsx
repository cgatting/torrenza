import { createElement, useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowDownToLine, ArrowRight, ArrowUp, Database, HardDrive, Radio, Search } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getSystemDrives, isHosted } from '../api/client';
import PageHeader from '../components/PageHeader';

function formatBytes(bytes = 0) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const unit = Math.min(units.length - 1, Math.floor(Math.log2(Math.max(1, bytes)) / 10));
  return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function Bandwidth({ samples, online, language }) {
  const latest = online ? samples.at(-1) : null;
  const scale = Math.max(1, ...samples.flatMap(sample => [sample.down, sample.up]));
  return (
    <section className="bandwidth" aria-labelledby="bandwidth-heading">
      <div className="panel-heading">
        <div><h2 id="bandwidth-heading">{language === 'de' ? 'Bandbreite' : 'Bandwidth'}</h2><p>{language === 'de' ? 'Die letzten 24 Messwerte' : 'Last 24 transfer samples'}</p></div>
        <span className="bandwidth-status"><i data-state={online ? 'online' : 'offline'} />{latest ? (language === 'de' ? 'Live' : 'Live') : (language === 'de' ? 'Nicht verfügbar' : 'Unavailable')}</span>
      </div>
      <div className="bandwidth-rates">
        <div><span><ArrowDown size={14} /> {language === 'de' ? 'Download' : 'Download'}</span><strong>{latest ? `${formatBytes(latest.down)}/s` : '—'}</strong></div>
        <div><span><ArrowUp size={14} /> {language === 'de' ? 'Upload' : 'Upload'}</span><strong>{latest ? `${formatBytes(latest.up)}/s` : '—'}</strong></div>
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
      <div className="chart-axis"><span>{language === 'de' ? 'Früher' : 'Earlier'}</span><span>{language === 'de' ? 'Letzter Messwert' : 'Latest sample'}</span></div>
    </section>
  );
}

export default function DashboardPage() {
  const { torrents, connection, samples, setActivePage, language } = useAppStore();
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
    [ArrowDownToLine, language === 'de' ? 'Aktive Downloads' : 'Active downloads', torrents.filter(t => t.status === 201).length, language === 'de' ? 'Wird gerade übertragen' : 'Currently transferring', 'violet'],
    [Database, language === 'de' ? 'Heruntergeladen' : 'Downloaded', formatBytes(downloaded), language === 'de' ? 'In der aktuellen Warteschlange' : 'Across the current queue', 'blue'],
    [Radio, language === 'de' ? 'Seeding' : 'Seeding', torrents.filter(t => t.status === 136).length, online ? (language === 'de' ? `${formatBytes(uploaded)} hochgeladen` : `${formatBytes(uploaded)} uploaded`) : (language === 'de' ? 'Uploadsumme nicht verfügbar' : 'Upload total unavailable'), 'green'],
    [HardDrive, language === 'de' ? 'Speicher belegt' : 'Storage used', total ? `${Math.round((total - free) / total * 100)}%` : '—', online && total ? (language === 'de' ? `${formatBytes(free)} frei` : `${formatBytes(free)} free`) : (language === 'de' ? 'Kapazität nicht verfügbar' : 'Capacity unavailable'), 'amber'],
  ];

  return (
    <div className="dashboard">
      <PageHeader title={language === 'de' ? 'Übersicht' : 'Overview'} description={language === 'de' ? 'Überwache Downloads, Bandbreite und lokalen Speicher.' : 'Monitor transfers, bandwidth, and local storage.'}>
        <button className="btn-primary" onClick={() => setActivePage('search')}><Search size={17} /> {language === 'de' ? 'Torrents finden' : 'Find torrents'}</button>
      </PageHeader>
      {isHosted ? (
        <section className="card hosted-panel">
          <span className="metric-icon violet"><ArrowDownToLine size={20} /></span>
          <h2>{language === 'de' ? 'Downloads laufen auf deinem Gerät' : 'Downloads run on your device'}</h2>
          <p>{language === 'de' ? 'Finde einen Torrent in Torrenza und öffne den Magnet-Link mit deinem installierten Torrent-Programm.' : 'Find a torrent in Torrenza and open its magnet link with your installed torrent client.'}</p>
          <a className="btn-secondary" href="https://www.qbittorrent.org/download" target="_blank" rel="noreferrer">{language === 'de' ? 'qBittorrent herunterladen' : 'Get qBittorrent'} <ArrowRight size={16} /></a>
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
            <Bandwidth samples={samples} online={online} language={language} />
            <section className="card recent-panel" aria-labelledby="recent-heading">
              <div className="panel-heading">
                <div><h2 id="recent-heading">{language === 'de' ? 'Letzte Downloads' : 'Recent downloads'}</h2><p>{language === 'de' ? 'Deine letzten Übertragungen' : 'Your latest transfers'}</p></div>
                <button className="btn-icon" aria-label={language === 'de' ? 'Downloads öffnen' : 'Open downloads'} onClick={() => setActivePage('downloads')}><ArrowRight size={18} /></button>
              </div>
              {recent.length ? <ul className="recent-list">{recent.map(torrent => (
                <li key={torrent.hash}>
                  <span className="metric-icon violet"><ArrowDownToLine size={15} /></span>
                  <div><strong title={torrent.name}>{torrent.name}</strong><small>{language === 'de' ? ({ 201: 'Wird heruntergeladen', 136: 'Wird bereitgestellt', 32: 'Pausiert' }[torrent.status] || 'Wartet') : ({ 201: 'Downloading', 136: 'Seeding', 32: 'Paused' }[torrent.status] || 'Waiting')}</small></div>
                  <span>{Math.round(torrent.progress || 0)}%</span>
                </li>
              ))}</ul> : (
                <div className="recent-empty">
                  <span className="metric-icon violet"><Activity size={22} /></span>
                  <strong>{online ? (language === 'de' ? 'Noch keine Downloads' : 'No downloads yet') : connection === 'connecting' ? (language === 'de' ? 'Verbindung zum Client wird hergestellt' : 'Connecting to the engine') : (language === 'de' ? 'Client nicht verbunden' : 'Engine disconnected')}</strong>
                  <p>{online ? (language === 'de' ? 'Gestartete Torrents erscheinen hier.' : 'Torrents you start will appear here.') : (language === 'de' ? 'Übertragungen werden angezeigt, sobald der Client verbunden ist.' : 'Transfer activity appears when the engine is connected.')}</p>
                </div>
              )}
            </section>
          </div>

          <section className="card storage-panel" aria-labelledby="storage-heading">
            <div className="panel-heading"><div><h2 id="storage-heading">{language === 'de' ? 'Speicherlaufwerke' : 'Storage drives'}</h2><p>{language === 'de' ? 'Kapazität der erkannten Laufwerke' : 'Capacity across detected volumes'}</p></div><HardDrive size={20} /></div>
            {online && drives?.length ? (
              <ul className="drive-grid">{drives.map((drive, index) => {
                const used = drive.totalSpace ? Math.min(100, Math.max(0, (drive.totalSpace - drive.freeSpace) / drive.totalSpace * 100)) : 0;
                const name = drive.letter || `Drive ${index + 1}`;
                return <li key={name}>
                  <div><strong>{name}</strong><span>{formatBytes(drive.freeSpace)} {language === 'de' ? 'frei' : 'free'}</span></div>
                  <progress aria-label={language === 'de' ? `${name} belegter Speicher` : `${name} space used`} max={100} value={used} />
                  <small>{formatBytes(drive.totalSpace)} {language === 'de' ? 'gesamt' : 'total'}</small>
                </li>;
              })}</ul>
            ) : <p className="storage-empty">{!online || drives === false ? (language === 'de' ? 'Speicherinformationen nicht verfügbar.' : 'Storage information unavailable.') : drives ? (language === 'de' ? 'Keine Laufwerke erkannt.' : 'No drives detected.') : (language === 'de' ? 'Speicher wird geprüft…' : 'Checking storage…')}</p>}
          </section>
        </>
      )}
    </div>
  );
}
