import React, { useState, useCallback, useRef, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { searchTorrents, startDownload, previewMagnet, openMagnet, isHosted } from '../api/client';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '◈' },
  { id: 'video', label: 'Movies', icon: '🎬' },
  { id: 'audio', label: 'Music', icon: '🎵' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'software', label: 'Software', icon: '💻' },
  { id: 'document', label: 'Documents', icon: '📄' },
];

const SORT_OPTIONS = [
  { value: 'seeders', label: 'Most Seeders' },
  { value: 'fastest', label: 'Fastest Download' },
  { value: 'size', label: 'File Size' },
  { value: 'name', label: 'Name A-Z' },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function SearchRadar({ term, sources }) {
  return <div className="search-radar-card" role="status" aria-live="polite">
    <div className="search-radar" aria-hidden="true"><div className="radar-ring"/><div className="radar-ring inner"/><div className="radar-sweep"/><span className="radar-dot one"/><span className="radar-dot two"/><span className="radar-dot three"/><div className="radar-core"><svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></div></div>
    <div className="radar-copy"><div className="radar-label"><span/> SEARCH IN PROGRESS</div><h3>Scanning the indexes<span className="radar-dots">...</span></h3><p>Looking for <strong>“{term}”</strong></p><div className="radar-sources">{sources.map((source, i) => <span key={source} style={{animationDelay:`${i * .12}s`}}>{source}</span>)}</div><small>Waiting for sources to respond</small></div>
  </div>;
}

function HealthDot({ seeders }) {
  if (seeders > 1000) return <span className="w-2 h-2 rounded-full bg-emerald-400" />;
  if (seeders > 100) return <span className="w-2 h-2 rounded-full bg-primary" />;
  if (seeders > 0) return <span className="w-2 h-2 rounded-full bg-rose-400" />;
  return <span className="w-2 h-2 rounded-full bg-gray-600" />;
}

function TypeIcon({ name }) {
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  const isVideo = ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext);
  const isAudio = ['mp3', 'flac', 'wav', 'ogg', 'm4a'].includes(ext);
  const isArchive = ['zip', 'rar', '7z', 'tar', 'iso'].includes(ext);

  const base = 'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0';
  if (isVideo) {
    return (
      <div className={`${base} bg-primary/12 text-primary`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polygon points="10,9 15,12 10,15" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }
  if (isAudio) {
    return (
      <div className={`${base} bg-accent-purple/12 text-accent-purple`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
    );
  }
  if (isArchive) {
    return (
      <div className={`${base} bg-accent-amber/12 text-accent-amber`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <line x1="2" y1="9" x2="22" y2="9" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${base} bg-accent-cyan/12 text-accent-cyan`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
    </div>
  );
}

function ResultCard({ result, onDownload, isDownloading, onCopyMagnet }) {
  const [expanded, setExpanded] = useState(false);
  const isHD = /\b(720p|1080p|2160p|4k|uhd)\b/i.test(result.name);
  const codecMatch = result.name.match(/\b(x264|x265|hevc|h264|av1|vp9)\b/i);

  return (
    <div className="card card-hover group animate-fade-in">
      <div className="flex items-start gap-4">
        <TypeIcon name={result.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="badge-gray text-[10px] uppercase tracking-wide">{result.engine}</span>
                {isHD && <span className="badge-amber text-[10px]">HD</span>}
                {codecMatch && <span className="badge-gray text-[10px] uppercase">{codecMatch[1]}</span>}
              </div>

              <h3
                className="text-white font-semibold text-sm mb-1.5 leading-snug cursor-pointer hover:text-primary transition-colors"
                onClick={() => setExpanded(!expanded)}
                title={result.name}
              >
                {result.name}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <HealthDot seeders={result.seeders} />
                  <span className="font-medium text-gray-300">{result.seeders.toLocaleString()}</span>
                  seeders
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                  {result.size}
                </span>
                {result.peers > 0 && (
                  <span className="text-gray-500">{result.peers.toLocaleString()} leechers</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={() => onDownload(result)}
                disabled={isDownloading}
                className="btn-primary text-sm px-4 py-2"
              >
                {isDownloading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </>
                )}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCopyMagnet(result)}
                  className="btn-icon"
                  title="Copy magnet link"
                  aria-label="Copy magnet link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-gray-500 hover:text-white transition-colors px-1"
                >
                  {expanded ? 'Less' : 'More'}
                </button>
              </div>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border-subtle animate-fade-in">
              <div className="text-[10px] uppercase tracking-wide text-gray-600 mb-1.5">Magnet Link</div>
              <div className="text-xs text-gray-500 font-mono break-all bg-surface rounded-lg p-2.5 border border-border">
                {result.magnetLink}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MagnetPreviewCard({ preview, onDownload, downloading }) {
  return (
    <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-green text-[10px]">MAGNET COMPILED</span>
            {preview.meta?.status === 'ok' && (
              <span className="badge-gray text-[10px]">✓ Metadata fetched</span>
            )}
          </div>
          <h4 className="text-white font-semibold text-sm mb-1.5 break-words">
            {preview.parsed?.name || 'Unnamed torrent'}
          </h4>
          {preview.parsed?.hash && (
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-1 break-all">
              <span className="badge-gray flex-shrink-0">HASH</span>
              {preview.parsed.hash}
            </div>
          )}
          {preview.meta?.status === 'ok' && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1.5">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
                {formatBytes(preview.meta.total_size)}
              </span>
              <span>{preview.meta.num_files} files</span>
            </div>
          )}
          {preview.meta?.status && preview.meta.status !== 'ok' && (
            <p className="text-xs text-amber-300/90 mt-1.5">
              {preview.meta.message || 'Metadata not available yet — you can still start the download.'}
            </p>
          )}
          {preview.parsed?.trackers?.length > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">
              {preview.parsed.trackers.length} tracker{preview.parsed.trackers.length === 1 ? '' : 's'} attached
            </p>
          )}
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2 flex-shrink-0"
        >
          {downloading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </>
          )}
        </button>
      </div>

      {preview.meta?.status === 'ok' && preview.meta.files?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Files</div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {preview.meta.files.slice(0, 20).map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs text-gray-400">
                <span className="truncate font-mono">{f.path}</span>
                <span className="text-gray-500 flex-shrink-0">{formatBytes(f.size)}</span>
              </div>
            ))}
            {preview.meta.files.length > 20 && (
              <div className="text-xs text-gray-500">+ {preview.meta.files.length - 20} more files</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState({
    sourcesSearched: [],
    sourcesFailed: [],
    sourceResultCounts: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeSearch, setActiveSearch] = useState('');
  const [searched, setSearched] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('seeders');
  const [selectedSources, setSelectedSources] = useState([]);
  const [minSeeders, setMinSeeders] = useState(0);
  const [downloadingHashes, setDownloadingHashes] = useState(new Set());
  const [magnetInput, setMagnetInput] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [magnetPreview, setMagnetPreview] = useState(null);
  const [pendingHandoff, setPendingHandoff] = useState(null);
  const [checkingTorrent, setCheckingTorrent] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [magnetDownloading, setMagnetDownloading] = useState(false);
  const [magnetOpen, setMagnetOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('torrenza:recentSearches') || '[]');
    } catch {
      return [];
    }
  });
  const { addToast, settings, ui, setPendingSearch } = useAppStore();
  const searchInputRef = useRef(null);

  const saveRecentSearch = (term) => {
    const normalized = term.trim();
    if (!normalized) return;
    setRecentSearches((prev) => {
      const next = [normalized, ...prev.filter(q => q.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('torrenza:recentSearches', JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = useCallback(async (e, overrideQuery) => {
    e?.preventDefault();
    const term = (overrideQuery ?? query).trim();
    if (!term) {
      setResults([]);
      setSearched(false);
      setSearchMeta({ sourcesSearched: [], sourcesFailed: [], sourceResultCounts: [] });
      return;
    }

    setActiveSearch(term);
    setLoading(true);
    setSearched(true);
    setResults([]);
    setSearchMeta({ sourcesSearched: [], sourcesFailed: [], sourceResultCounts: [] });

    try {
      const res = await searchTorrents({ query: term, fileType: category, sortBy, sortDir: 'desc' });
      let data = res.data?.results || [];
      const sourcesSearched = Array.isArray(res.data?.sourcesSearched) ? res.data.sourcesSearched : [];
      const sourcesFailed = Array.isArray(res.data?.sourcesFailed) ? res.data.sourcesFailed : [];
      const sourceResultCounts = Object.entries(
        (res.data?.results || []).reduce((acc, result) => {
          const source = result.engine || 'Unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

      if (selectedSources.length > 0) {
        data = data.filter((result) => selectedSources.includes(result.engine || 'Unknown'));
      }

      if (minSeeders > 0) {
        data = data.filter((result) => (result.seeders || 0) >= minSeeders);
      }

      saveRecentSearch(term);
      setResults(data);
      setSearchMeta({ sourcesSearched, sourcesFailed, sourceResultCounts });
    } catch {
      addToast({ type: 'error', message: 'Search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [query, category, sortBy, selectedSources, minSeeders, addToast]);

  useEffect(() => {
    const pending = ui.pendingSearch;
    if (!pending) return;
    const id = setTimeout(() => {
      setPendingSearch('');
      setQuery(pending);
      searchInputRef.current?.focus();
      handleSearch(null, pending);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.pendingSearch]);

  const toggleSourceFilter = useCallback((source) => {
    setSelectedSources((current) => (
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    ));
  }, []);

  const inspectTorrent = (preview) => {
    const files = preview?.meta?.files || [];
    const riskyExtensions = /\.(exe|dll|msi|bat|cmd|ps1|vbs|vbe|js|jse|wsf|wsh|hta|scr|com|pif|lnk|jar|apk|app|deb|rpm|sh|bash)$/i;
    const findings = files.filter((file) => {
      const name = String(file.path || '');
      return riskyExtensions.test(name) || /\.(mkv|mp4|avi|pdf|jpg|png|zip|rar)\.(exe|scr|com|bat|cmd|js|vbs|ps1)$/i.test(name)
        || name.split('/').some((part) => part === '..');
    }).map((file) => file.path);
    return { files, findings, inspected: preview?.meta?.status === 'ok' };
  };

  const handleDownload = useCallback(async (result) => {
    if (downloadingHashes.has(result.hash)) return;
    setDownloadingHashes(prev => new Set([...prev, result.hash]));
    try {
      if (isHosted) {
        setCheckingTorrent(true);
        let preview;
        try {
          const response = await previewMagnet({ magnetLink: result.magnetLink });
          preview = response.data;
        } catch {
          preview = null;
        }
        setPendingHandoff({ magnet: result.magnetLink, name: result.name, ...inspectTorrent(preview) });
      } else {
        await startDownload({ magnetLink: result.magnetLink, name: result.name, size: result.size, destination: settings.downloadPath || 'C:/Downloads' });
        addToast({ type: 'success', message: `Download started: ${result.name.slice(0, 50)}` });
      }
    } catch (err) {
      addToast({ type: 'error', message: `Failed to start download: ${err.message}` });
    } finally {
      setCheckingTorrent(false);
      setDownloadingHashes(prev => { const next = new Set(prev); next.delete(result.hash); return next; });
    }
  }, [downloadingHashes, settings.downloadPath, addToast]);

  const continueToTorrentApp = useCallback((magnet, name) => {
    openMagnet(magnet);
    addToast({ type: 'info', message: `Handed “${name.slice(0, 45)}” to your torrent app. Torrenza only checked torrent metadata; it did not scan downloaded files for viruses.` });
    setPendingHandoff(null);
  }, [addToast]);

  const handleCopyMagnet = useCallback(async (result) => {
    try {
      await navigator.clipboard.writeText(result.magnetLink || '');
      addToast({ type: 'success', message: 'Magnet link copied to clipboard' });
    } catch {
      addToast({ type: 'error', message: 'Could not copy magnet link' });
    }
  }, [addToast]);

  const handleMagnetPreview = useCallback(async () => {
    const magnet = magnetInput.trim();
    if (!magnet.startsWith('magnet:?')) {
      setPreviewError('Please paste a valid magnet link starting with "magnet:?"');
      setMagnetPreview(null);
      return;
    }
    setPreviewing(true);
    setPreviewError('');
    setMagnetPreview(null);
    try {
      const res = await previewMagnet({ magnetLink: magnet });
      setMagnetPreview(res.data);
    } catch {
      setPreviewError('Could not compile this magnet. It may still download — try Download.');
    } finally {
      setPreviewing(false);
    }
  }, [magnetInput]);

  const handleMagnetDownload = useCallback(async () => {
    const magnet = magnetInput.trim();
    if (!magnet) return;
    const name = magnetPreview?.parsed?.name || 'Download from magnet link';
    setMagnetDownloading(true);
    try {
      if (isHosted) {
        setPendingHandoff({ magnet, name, ...inspectTorrent(magnetPreview) });
        return;
      } else await startDownload({ magnetLink: magnet, name, size: '', destination: settings.downloadPath || 'C:/Downloads' });
      addToast({ type: 'success', message: `Download started: ${name.slice(0, 50)}` });
      setMagnetInput('');
      setMagnetPreview(null);
      setPreviewError('');
    } catch (err) {
      addToast({ type: 'error', message: `Failed to start download: ${err.message}` });
    } finally {
      setMagnetDownloading(false);
    }
  }, [magnetInput, magnetPreview, settings.downloadPath, addToast]);

  return (
    <div className="space-y-6 animate-fade-in">
      {pendingHandoff && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="torrent-check-title">
        <div className="card w-full max-w-xl border-amber-500/30 shadow-2xl">
          <div className="flex items-start gap-3"><span className="text-2xl">{pendingHandoff.findings.length ? '⚠️' : '🛡️'}</span><div className="min-w-0"><h2 id="torrent-check-title" className="text-lg font-semibold text-white">Torrent metadata check</h2><p className="mt-1 text-sm text-gray-300 break-words">{pendingHandoff.name}</p></div></div>
          <p className="mt-4 text-sm text-gray-400">This check inspects filenames and torrent metadata only. It does not scan the files’ contents or certify that they are safe.</p>
          {!pendingHandoff.inspected && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Torrenza could not retrieve the torrent metadata, so it could not inspect the file list.</p>}
          {pendingHandoff.findings.length > 0 && <div className="mt-3 rounded-lg bg-rose-500/10 p-3"><p className="text-sm font-medium text-rose-200">Potentially risky filenames found:</p><ul className="mt-2 max-h-36 overflow-auto list-disc pl-5 text-xs text-rose-100">{pendingHandoff.findings.slice(0, 12).map((file, i) => <li key={`${file}-${i}`} className="break-all">{file}</li>)}</ul></div>}
          {pendingHandoff.inspected && pendingHandoff.findings.length === 0 && <p className="mt-3 text-sm text-emerald-300">No executable or script filenames were found in the metadata. This is not an antivirus scan.</p>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setPendingHandoff(null)}>Cancel</button><button className="btn-primary" onClick={() => continueToTorrentApp(pendingHandoff.magnet, pendingHandoff.name)}>Continue to torrent app ↗</button></div>
        </div>
      </div>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Search Torrents</h1>
          <p className="text-gray-400 text-sm mt-1">Find content across multiple sources in one place</p>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <span className="badge-gray">{results.length} results</span>
          )}
          <button
            onClick={() => setMagnetOpen(!magnetOpen)}
            className={`btn-secondary text-sm ${magnetOpen ? 'border-primary/40 text-primary' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Magnet
          </button>
        </div>
      </div>

      {magnetOpen && (
        <div className="card animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">Paste a Magnet Link</span>
            <span className="badge-gray text-[10px]">ADD BY LINK</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Copy any magnet link and we'll compile a preview before downloading.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={magnetInput}
              onChange={e => setMagnetInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMagnetPreview(); } }}
              placeholder="magnet:?xt=urn:btih:...&dn=...&tr=..."
              className="input flex-1 font-mono text-xs"
            />
            <button
              onClick={handleMagnetPreview}
              disabled={previewing || !magnetInput.trim()}
              className="btn-secondary text-sm px-4 whitespace-nowrap"
            >
              {previewing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Compiling…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                  Preview
                </>
              )}
            </button>
          </div>

          {previewError && <p className="text-xs text-rose-400 mt-3">{previewError}</p>}

          {magnetPreview && (
            <MagnetPreviewCard
              preview={magnetPreview}
              onDownload={handleMagnetDownload}
              downloading={magnetDownloading}
            />
          )}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search movies, shows, software, games…"
              className="input pl-12 pr-36 py-4 text-base"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                  className="text-gray-500 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Clear search"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <span className="kbd hidden sm:inline-flex">↵</span>
              <button type="submit" className="btn-primary px-5">
                Search
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={category === cat.id ? 'chip chip-active' : 'chip chip-idle'}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <svg className="text-gray-500" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                  <path d="M8 10l4 4 4-4" />
                </svg>
                <select
                  value={minSeeders}
                  onChange={e => setMinSeeders(parseInt(e.target.value))}
                  title="Minimum seeders filter"
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value={0}>Any seeders</option>
                  <option value={10}>10+ seeders</option>
                  <option value={50}>50+ seeders</option>
                  <option value={100}>100+ seeders</option>
                  <option value={500}>500+ seeders</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <svg className="text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M6 12h12M10 18h4" />
                </svg>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>

      {!searched && recentSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="section-label mr-1">Recent</span>
          {recentSearches.map(q => (
            <button
              key={q}
              onClick={() => { setQuery(q); handleSearch(null, q); }}
              className="chip chip-idle"
            >
              <svg className="text-gray-500" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {q}
            </button>
          ))}
          <button
            onClick={() => { setRecentSearches([]); localStorage.removeItem('torrenza:recentSearches'); }}
            className="text-xs text-gray-500 hover:text-rose-400 transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {!loading && searched && searchMeta.sourcesSearched.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="section-label mr-1">Sources</span>
          {searchMeta.sourcesSearched.map((source) => {
            const failureCount = searchMeta.sourcesFailed.filter((item) => item.source === source).length;
            const resultCount = searchMeta.sourceResultCounts.find((item) => item.source === source)?.count || 0;
            const failed = failureCount > 0;
            const selected = selectedSources.includes(source);
            return (
              <button
                key={source}
                onClick={() => toggleSourceFilter(source)}
                className={
                  selected
                    ? 'chip bg-white/10 border-white/25 text-white'
                    : resultCount > 0
                      ? 'chip bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50'
                      : failed
                        ? 'chip bg-rose-500/10 border-rose-500/30 text-rose-300 hover:border-rose-500/50'
                        : 'chip chip-idle'
                }
              >
                {source}
                {resultCount > 0 ? ` (${resultCount})` : failed ? ' — failed' : ''}
              </button>
            );
          })}
          {selectedSources.length > 0 && (
            <button
              onClick={() => setSelectedSources([])}
              className="text-xs text-gray-400 hover:text-white transition-colors ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading && (
        <SearchRadar term={activeSearch} sources={settings.enabledSources || []} />
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div key={`${result.hash}-${idx}`} style={{ animationDelay: `${idx * 40}ms` }}>
              <ResultCard
                result={result}
                onDownload={handleDownload}
                isDownloading={downloadingHashes.has(result.hash)}
                onCopyMagnet={handleCopyMagnet}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Try different keywords, check your spelling, or clear the source filters.
          </p>
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); searchInputRef.current?.focus(); }}
            className="btn-secondary mt-4"
          >
            Clear Search
          </button>
        </div>
      )}

      {!loading && !searched && (
        <div className="card text-center py-20 border-dashed">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold text-white mb-2">Search millions of torrents</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter a search term above to find torrents from multiple sources including 1337x, Nyaa, and more.
          </p>
        </div>
      )}
    </div>
  );
}
