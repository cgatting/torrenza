import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import useAppStore from '../store/useAppStore';
import { searchTorrents, startDownload } from '../api/client';

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

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 bg-surface rounded w-3/4 mb-3" />
          <div className="flex gap-3">
            <div className="h-4 bg-surface rounded w-20" />
            <div className="h-4 bg-surface rounded w-20" />
            <div className="h-4 bg-surface rounded w-24" />
          </div>
        </div>
        <div className="h-9 bg-surface rounded w-28" />
      </div>
    </div>
  );
}

function HealthDot({ seeders }) {
  if (seeders > 1000) return <span className="w-2 h-2 rounded-full bg-primary" />;
  if (seeders > 100) return <span className="w-2 h-2 rounded-full bg-accent-amber" />;
  if (seeders > 0) return <span className="w-2 h-2 rounded-full bg-rose-400" />;
  return <span className="w-2 h-2 rounded-full bg-gray-600" />;
}

function ResultCard({ result, onDownload, isDownloading }) {
  const [expanded, setExpanded] = useState(false);
  const isMovie = /\.(mkv|mp4|avi|mov|wmv)/i.test(result.name);
  const isHD = /\b(720p|1080p|2160p|4k|uhd)\b/i.test(result.name);
  const codecMatch = result.name.match(/\b(x264|x265|hevc|h264|av1|vp9)\b/i);

  return (
    <div className="card card-hover group animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isMovie && <span className="badge-green text-[10px]">🎬 VIDEO</span>}
            {isHD && <span className="badge-gray text-[10px]">HD</span>}
            {codecMatch && <span className="badge-gray text-[10px] uppercase">{codecMatch[1]}</span>}
            <span className={`flex items-center gap-1 text-xs text-gray-400`}>
              <HealthDot seeders={result.seeders} />
              {result.seeders.toLocaleString()} seeders
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">{result.engine}</span>
          </div>

          <h3
            className="text-white font-semibold text-sm mb-2 leading-snug cursor-pointer hover:text-primary transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {result.name}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              </svg>
              {result.size}
            </span>
            {result.format && result.format !== 'Unknown' && (
              <span className="badge-gray text-[10px]">{result.format}</span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-border-subtle animate-fade-in">
              <div className="text-xs text-gray-500 font-mono break-all bg-surface rounded p-2">
                {result.magnetLink?.slice(0, 120)}...
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={() => onDownload(result)}
            disabled={isDownloading}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </>
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? '▲ Hide info' : '▼ Show info'}
          </button>
        </div>
      </div>
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
  const [searched, setSearched] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('seeders');
  const [selectedSources, setSelectedSources] = useState([]);
  const [downloadingHashes, setDownloadingHashes] = useState(new Set());
  const { addToast } = useAppStore();

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setSearchMeta({ sourcesSearched: [], sourcesFailed: [], sourceResultCounts: [] });
      return;
    }

    setLoading(true);
    setSearched(true);
    setResults([]);
    setSearchMeta({ sourcesSearched: [], sourcesFailed: [], sourceResultCounts: [] });

    try {
      const res = await searchTorrents({ query, fileType: category, sortBy, sortDir: 'desc' });
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

      if (category !== 'all') {
        data = data.filter(r => r.name.toLowerCase().includes(category));
      }

      if (selectedSources.length > 0) {
        data = data.filter((result) => selectedSources.includes(result.engine || 'Unknown'));
      }

      setResults(data);
      setSearchMeta({ sourcesSearched, sourcesFailed, sourceResultCounts });
    } catch (err) {
      addToast({ type: 'error', message: 'Search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [query, category, sortBy, selectedSources, addToast]);

  const toggleSourceFilter = useCallback((source) => {
    setSelectedSources((current) => (
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    ));
  }, []);

  const handleDownload = useCallback(async (result) => {
    if (downloadingHashes.has(result.hash)) return;

    setDownloadingHashes(prev => new Set([...prev, result.hash]));

    try {
      await startDownload({
        magnetLink: result.magnetLink,
        name: result.name,
        size: result.size,
        destination: 'C:/Downloads',
      });
      addToast({ type: 'success', message: `Download started: ${result.name.slice(0, 50)}` });
    } catch (err) {
      addToast({ type: 'error', message: `Failed to start download: ${err.message}` });
    } finally {
      setDownloadingHashes(prev => {
        const next = new Set(prev);
        next.delete(result.hash);
        return next;
      });
    }
  }, [downloadingHashes, addToast]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Search Torrents</h1>
          <p className="text-gray-400 text-sm mt-1">Find and download from multiple sources</p>
        </div>
        <div className="text-sm text-gray-500">
          {results.length > 0 && `${results.length} results`}
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search movies, software, music, games..."
              className="input pl-12 pr-32 py-4 text-base"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-5">
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-surface text-gray-400 border border-border hover:border-border-active'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="ml-auto bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {!loading && searched && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-300">
              Searched {searchMeta.sourcesSearched.length} enabled source{searchMeta.sourcesSearched.length === 1 ? '' : 's'}
            </span>
            {searchMeta.sourcesFailed.length > 0 && (
              <span className="text-amber-300">
                {searchMeta.sourcesFailed.length} source{searchMeta.sourcesFailed.length === 1 ? '' : 's'} failed
              </span>
            )}
          </div>

          {searchMeta.sourceResultCounts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">Results By Source</div>
              <div className="flex flex-wrap gap-2">
                {searchMeta.sourceResultCounts.map(({ source, count }) => (
                  <span key={source} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                    {source}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {searchMeta.sourcesSearched.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Enabled Sources Queried</div>
                {selectedSources.length > 0 && (
                  <button
                    onClick={() => setSelectedSources([])}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Clear source filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {searchMeta.sourcesSearched.map((source) => {
                  const failureCount = searchMeta.sourcesFailed.filter((item) => item.source === source).length;
                  const resultCount = searchMeta.sourceResultCounts.find((item) => item.source === source)?.count || 0;
                  const failed = failureCount > 0;
                  const selected = selectedSources.includes(source);
                  return (
                    <button
                      key={source}
                      onClick={() => toggleSourceFilter(source)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-white bg-white/10 text-white'
                          : resultCount > 0
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : failed
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                              : 'border-border bg-surface text-gray-300'
                      }`}
                    >
                      {source}
                      {resultCount > 0 ? ` (${resultCount})` : ''}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                Green means results found, red means the source failed, and no source selected shows all results.
              </p>
            </div>
          )}

        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div key={`${result.hash}-${idx}`} style={{ animationDelay: `${idx * 40}ms` }}>
              <ResultCard
                result={result}
                onDownload={handleDownload}
                isDownloading={downloadingHashes.has(result.hash)}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
          <p className="text-gray-400 text-sm">
            Try different keywords or check your spelling.
          </p>
          <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="btn-secondary mt-4">
            Clear Search
          </button>
        </div>
      )}

      {!loading && !searched && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold text-white mb-2">Search millions of torrents</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter a search term above to find torrents from multiple sources including 1337x, The Pirate Bay, RarBG, and more.
          </p>
        </div>
      )}
    </div>
  );
}
