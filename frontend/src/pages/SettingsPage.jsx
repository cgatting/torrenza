import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import useAppStore from '../store/useAppStore';
import { getSettings, saveSettings, getProviders, testProviders, isHosted } from '../api/client';

const iconProps = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const SECTIONS = [
  {
    id: 'connection',
    label: 'Connection',
    description: 'Ports, limits and security toggles',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" />
      </svg>
    ),
  },
  {
    id: 'downloads',
    label: 'Downloads',
    description: 'Paths, queue and seed limits',
    icon: (
      <svg {...iconProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    id: 'providers',
    label: 'Providers',
    description: 'Enable or disable search sources',
    icon: (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group py-3">
      <div>
        <div className="text-sm text-gray-200 group-hover:text-ink transition-colors">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      <div className="relative flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface border border-border'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </label>
  );
}

function Field({ label, description, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink mb-1">{label}</h3>
      {description && <p className="text-xs text-gray-500 mb-3">{description}</p>}
      {children}
    </div>
  );
}

function SectionConnection({ settings, updateSetting, language }) {
  const randomizePort = () => {
    const port = Math.floor(Math.random() * (65535 - 10000)) + 10000;
    updateSetting('listenPort', port);
  };

  return (
    <div className="space-y-7">
      <Field label={language === 'de' ? 'Eingehender Port' : 'Listen Port'} description={language === 'de' ? 'Port für eingehende Verbindungen. Bei einer Blockierung zufällig wählen.' : 'Port used for incoming connections. Randomize if blocked.'}>
        <div className="flex gap-3">
          <input
            type="number"
            value={settings.listenPort || 6881}
            onChange={e => updateSetting('listenPort', parseInt(e.target.value))}
            className="input w-32"
          />
          <button onClick={randomizePort} className="btn-secondary text-sm">
            {language === 'de' ? 'Zufällig wählen' : 'Randomize'}
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={language === 'de' ? 'Maximale Verbindungen' : 'Max Connections'}>
          <input
            type="number"
            value={settings.maxConnections || 200}
            onChange={e => updateSetting('maxConnections', parseInt(e.target.value))}
            className="input"
          />
        </Field>
        <Field label={language === 'de' ? 'Maximale aktive Downloads' : 'Max Active Downloads'}>
          <input
            type="number"
            value={settings.maxActiveDownloads || 5}
            onChange={e => updateSetting('maxActiveDownloads', parseInt(e.target.value))}
            className="input"
          />
        </Field>
      </div>

      <Field label={language === 'de' ? 'Maximale Upload-Geschwindigkeit (KB/s)' : 'Max Upload Speed (KB/s)'} description={language === 'de' ? '0 = unbegrenzt' : '0 = unlimited'}>
        <input
          type="number"
          value={settings.maxSpeed || 0}
          onChange={e => updateSetting('maxSpeed', parseInt(e.target.value))}
          className="input w-40"
        />
      </Field>

      <div className="pt-2 border-t border-border-subtle divide-y divide-border-subtle">
        <Toggle
          checked={settings.sslVerification !== false}
          onChange={e => updateSetting('sslVerification', e.target.checked)}
          label={language === 'de' ? 'SSL-Zertifikate überprüfen' : 'Verify SSL Certificates'}
          description={language === 'de' ? 'Verbindungen mit ungültigen TLS-Zertifikaten ablehnen' : 'Reject connections with invalid TLS certificates'}
        />
        <Toggle
          checked={settings.copyrightFilter === true}
          onChange={e => updateSetting('copyrightFilter', e.target.checked)}
          label={language === 'de' ? 'Urheberrechtlich geschützte Inhalte filtern' : 'Filter Copyrighted Content'}
          description={language === 'de' ? 'Als urheberrechtlich geschützt markierte Ergebnisse ausblenden' : 'Hide results flagged as copyrighted material'}
        />
      </div>
    </div>
  );
}

function SectionDownloads({ settings, updateSetting, language }) {
  return (
    <div className="space-y-7">
      <Field label={language === 'de' ? 'Standard-Downloadpfad' : 'Default Download Path'} description={language === 'de' ? 'Speicherort für heruntergeladene Dateien' : 'Where downloaded files are saved'}>
        <input
          type="text"
          value={settings.downloadPath || 'C:/Downloads'}
          onChange={e => updateSetting('downloadPath', e.target.value)}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={language === 'de' ? 'Maximale aktive Uploads' : 'Max Active Seeds'}>
          <input
            type="number"
            value={settings.maxActiveSeeds || 10}
            onChange={e => updateSetting('maxActiveSeeds', parseInt(e.target.value))}
            className="input"
          />
        </Field>
        <Field label={language === 'de' ? 'Warteschlangengröße' : 'Queue Size'}>
          <input
            type="number"
            value={settings.queueSize || 100}
            onChange={e => updateSetting('queueSize', parseInt(e.target.value))}
            className="input"
          />
        </Field>
      </div>
    </div>
  );
}

function ProviderLogo({ name, color }) {
  const letter = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-ink text-sm flex-shrink-0 shadow-md"
      style={{ backgroundColor: color || '#e89557' }}
    >
      {letter}
    </div>
  );
}

function ProviderStatusBadge({ status, latencyMs, resultCount, language }) {
  if (status === 'testing') {
    return (
      <span className="badge-gray text-[10px]">
        <div className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
        {language === 'de' ? 'Wird getestet…' : 'Testing…'}
      </span>
    );
  }
  if (status === 'online') {
    return (
      <span className="badge-green text-[10px]">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        Online{latencyMs ? ` · ${latencyMs} ms` : ''}{resultCount != null ? ` · ${resultCount} ${language === 'de' ? 'Ergebnisse' : 'results'}` : ''}
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="badge-rose text-[10px]">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {language === 'de' ? 'Nicht erreichbar' : 'Unreachable'}
      </span>
    );
  }
  return (
    <span className="badge-gray text-[10px]">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      {language === 'de' ? 'Nicht getestet' : 'Not tested'}
    </span>
  );
}

function SectionProviders({ settings, updateSetting, addToast, language }) {
  const [providers, setProviders] = useState([]);
  const [testStatus, setTestStatus] = useState({});
  const [testAllRunning, setTestAllRunning] = useState(false);

  useEffect(() => {
    getProviders()
      .then(r => setProviders(r.data?.providers || []))
      .catch(() => {});
  }, []);

  const runTest = useCallback(async (providerId) => {
    setTestStatus(prev => ({ ...prev, [providerId]: { status: 'testing' } }));
    try {
      const res = await testProviders({ providers: [providerId], query: 'test' });
      const result = res.data?.results?.[0];
      if (result) {
        setTestStatus(prev => ({
          ...prev,
          [providerId]: {
            status: result.ok ? 'online' : 'offline',
            latencyMs: result.latencyMs,
            resultCount: result.resultCount,
            error: result.error,
          },
        }));
      } else {
        setTestStatus(prev => ({ ...prev, [providerId]: { status: 'offline' } }));
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [providerId]: { status: 'offline' } }));
      addToast({ type: 'error', message: language === 'de' ? `Test für ${providerId} fehlgeschlagen` : `Test failed for ${providerId}` });
    }
  }, [addToast, language]);

  const runTestAll = useCallback(async () => {
    setTestAllRunning(true);
    try {
      const res = await testProviders({});
      const results = res.data?.results || [];
      const next = {};
      results.forEach(result => {
        next[result.id] = {
          status: result.ok ? 'online' : 'offline',
          latencyMs: result.latencyMs,
          resultCount: result.resultCount,
          error: result.error,
        };
      });
      setTestStatus(next);
      const online = results.filter(r => r.ok).length;
      addToast({ type: 'success', message: language === 'de' ? `Test abgeschlossen: ${online}/${results.length} Quellen online` : `Test complete: ${online}/${results.length} providers online` });
    } catch {
      addToast({ type: 'error', message: language === 'de' ? 'Quellentest fehlgeschlagen' : 'Provider test failed' });
    } finally {
      setTestAllRunning(false);
    }
  }, [addToast, language]);

  const toggleProvider = (provider) => {
    const current = settings.enabledSources || [];
    const next = current.includes(provider)
      ? current.filter(p => p !== provider)
      : [...current, provider];
    updateSetting('enabledSources', next);
  };

  const enabledCount = (settings.enabledSources || []).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink mb-1">{language === 'de' ? 'Torrent-Quellen' : 'Torrent Sources'}</h3>
          <p className="text-xs text-gray-500">{language === 'de' ? 'Teste die Quellen und wähle aus, welche die Suche verwendet' : 'Test each source and toggle what Search uses'}</p>
        </div>
        <button
          onClick={runTestAll}
          disabled={testAllRunning}
          className="btn-secondary text-xs px-4 py-2"
        >
          {testAllRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              {language === 'de' ? 'Alle werden getestet…' : 'Testing all…'}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              {language === 'de' ? 'Alle testen' : 'Test All'}
            </>
          )}
        </button>
      </div>

      {enabledCount > 0 && (
        <div className="text-xs text-gray-500">
          {language === 'de' ? `${enabledCount} von ${providers.length || 2} Quellen für die Suche aktiviert` : `${enabledCount} of ${providers.length || 2} source${enabledCount === 1 ? '' : 's'} enabled for search`}
        </div>
      )}

      <div className="space-y-3">
        {providers.map(provider => {
          const isEnabled = (settings.enabledSources || []).includes(provider.id);
          const status = testStatus[provider.id];
          return (
            <div
              key={provider.id}
              className={`rounded-xl border p-4 transition-all ${
                isEnabled
                  ? 'bg-surface/60 border-border hover:border-border-active/50'
                  : 'bg-surface/40 border-border opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <ProviderLogo name={provider.label} color={provider.color} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink">{provider.label}</span>
                    <span className="badge-gray text-[10px] uppercase tracking-wide">{provider.type}</span>
                    {status && (
                      <ProviderStatusBadge
                        status={status.status}
                        latencyMs={status.latencyMs}
                        resultCount={status.resultCount}
                        language={language}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{provider.description}</p>
                  {status?.status === 'offline' && status.error && (
                    <p className="text-[11px] text-rose-300/90 mt-1 truncate" title={status.error}>
                      {status.error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => runTest(provider.id)}
                    disabled={testStatus[provider.id]?.status === 'testing'}
                    className="btn-secondary text-xs px-3.5 py-2"
                  >
                    {testStatus[provider.id]?.status === 'testing' ? (language === 'de' ? 'Wird getestet…' : 'Testing…') : (language === 'de' ? 'Testen' : 'Test')}
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                      {isEnabled ? (language === 'de' ? 'Aktiviert' : 'Enabled') : (language === 'de' ? 'Deaktiviert' : 'Disabled')}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isEnabled}
                        onChange={() => toggleProvider(provider.id)}
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors ${isEnabled ? 'bg-primary' : 'bg-surface border border-border'}`} />
                      <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, updateSetting, addToast, language } = useAppStore();
  const [activeSection, setActiveSection] = useState('connection');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isHosted) getSettings().then(r => setSettings(r.data || {})).catch(() => {});
  }, [setSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!isHosted) await saveSettings(settings);
      addToast({ type: 'success', message: isHosted
        ? (language === 'de' ? 'Einstellungen gelten für diesen Besuch und werden beim nächsten Öffnen zurückgesetzt.' : 'Settings apply for this visit and reset when you reopen Torrenza')
        : (language === 'de' ? 'Einstellungen gespeichert' : 'Settings saved successfully') });
    } catch {
      addToast({ type: 'error', message: language === 'de' ? 'Einstellungen konnten nicht gespeichert werden' : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const current = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="animate-fade-in">
      <PageHeader title={language === 'de' ? 'Einstellungen' : 'Settings'} description={language === 'de' ? 'Verbindung, Downloads und Suchquellen verwalten.' : 'Manage connection, downloads, and search sources.'}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
              {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {language === 'de' ? 'Wird gespeichert…' : 'Saving…'}
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {language === 'de' ? 'Änderungen speichern' : 'Save Changes'}
            </>
          )}
        </button>
      </PageHeader>

      <div className="settings-layout mt-6">
        <div className="settings-nav card p-2" aria-label={language === 'de' ? 'Einstellungsbereiche' : 'Settings sections'} role="group">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                aria-pressed={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-400 hover:text-ink hover:bg-surface'
                }`}
              >
                <span className={`flex-shrink-0 ${activeSection === section.id ? 'text-primary' : ''}`}>
                  {section.icon}
                </span>
                <span>{language === 'de' ? ({ connection: 'Verbindung', downloads: 'Downloads', providers: 'Quellen' }[section.id]) : section.label}</span>
              </button>
            ))}
        </div>

        <div className="min-w-0">
          <div className="card">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2.5">
                <span className="text-primary">{current.icon}</span>
                {language === 'de' ? ({ connection: 'Verbindung', downloads: 'Downloads', providers: 'Quellen' }[current.id]) : current.label}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{language === 'de' ? ({ connection: 'Ports, Limits und Sicherheitseinstellungen', downloads: 'Pfade, Warteschlange und Upload-Limits', providers: 'Suchquellen aktivieren oder deaktivieren' }[current.id]) : current.description}</p>
            </div>

            {activeSection === 'connection' && (
              <SectionConnection settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'downloads' && (
              <SectionDownloads settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'providers' && (
              <SectionProviders settings={settings} updateSetting={updateSetting} addToast={addToast} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
