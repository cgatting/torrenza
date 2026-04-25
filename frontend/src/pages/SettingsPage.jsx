import React, { useState, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { getSettings, saveSettings } from '../api/client';

const SECTIONS = [
  { id: 'connection', label: 'Connection', icon: '🌐' },
  { id: 'downloads', label: 'Downloads', icon: '📥' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'providers', label: 'Providers', icon: '🔍' },
];

const PROVIDERS = [
  '1337x', 'Eztv', 'KickassTorrents', 'Limetorrents', 'Rarbg',
  'ThePirateBay', 'Torrent9', 'TorrentProject', 'Torrentz2', 'Yts',
];

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface border border-border'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );
}

function SectionConnection({ settings, updateSetting }) {
  const randomizePort = () => {
    const port = Math.floor(Math.random() * (65535 - 10000)) + 10000;
    updateSetting('listenPort', port);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Listen Port</h3>
        <p className="text-xs text-gray-500 mb-3">The port used for incoming connections. Randomize if blocked.</p>
        <div className="flex gap-3">
          <input
            type="number"
            value={settings.listenPort || 6881}
            onChange={e => updateSetting('listenPort', parseInt(e.target.value))}
            className="input w-32"
          />
          <button onClick={randomizePort} className="btn-secondary text-sm">
            Randomize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Max Connections</h3>
          <input
            type="number"
            value={settings.maxConnections || 200}
            onChange={e => updateSetting('maxConnections', parseInt(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Max Active Downloads</h3>
          <input
            type="number"
            value={settings.maxActiveDownloads || 5}
            onChange={e => updateSetting('maxActiveDownloads', parseInt(e.target.value))}
            className="input"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Max Upload Speed (KB/s, 0 = unlimited)</h3>
        <input
          type="number"
          value={settings.maxSpeed || 0}
          onChange={e => updateSetting('maxSpeed', parseInt(e.target.value))}
          className="input w-40"
        />
      </div>

      <div className="space-y-4 pt-2">
        <Toggle
          checked={settings.sslVerification !== false}
          onChange={e => updateSetting('sslVerification', e.target.checked)}
          label="Verify SSL Certificates"
        />
        <Toggle
          checked={settings.copyrightFilter === true}
          onChange={e => updateSetting('copyrightFilter', e.target.checked)}
          label="Filter Copyrighted Content"
        />
      </div>
    </div>
  );
}

function SectionDownloads({ settings, updateSetting }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Default Download Path</h3>
        <p className="text-xs text-gray-500 mb-3">Where downloaded files are saved</p>
        <input
          type="text"
          value={settings.downloadPath || 'C:/Downloads'}
          onChange={e => updateSetting('downloadPath', e.target.value)}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Max Active Seeds</h3>
          <input
            type="number"
            value={settings.maxActiveSeeds || 10}
            onChange={e => updateSetting('maxActiveSeeds', parseInt(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Queue Size</h3>
          <input
            type="number"
            value={settings.queueSize || 100}
            onChange={e => updateSetting('queueSize', parseInt(e.target.value))}
            className="input"
          />
        </div>
      </div>
    </div>
  );
}

function SectionAppearance({ settings, updateSetting }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Accent Color</h3>
        <p className="text-xs text-gray-500 mb-3">Choose the primary accent color for the interface</p>
        <div className="flex gap-3">
          {[
            { name: 'Green', color: '#4CAF50', active: true },
            { name: 'Cyan', color: '#00D9FF', active: false },
            { name: 'Purple', color: '#A855F7', active: false },
            { name: 'Amber', color: '#F59E0B', active: false },
          ].map(c => (
            <button
              key={c.name}
              onClick={() => updateSetting('accentColor', c.color)}
              className={`w-10 h-10 rounded-xl border-2 transition-all ${settings.accentColor === c.color ? 'border-white scale-110' : 'border-transparent hover:border-border'}`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionProviders({ settings, updateSetting }) {
  const toggleProvider = (provider) => {
    const current = settings.enabledSources || [];
    const next = current.includes(provider)
      ? current.filter(p => p !== provider)
      : [...current, provider];
    updateSetting('enabledSources', next);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Torrent Sources</h3>
        <p className="text-xs text-gray-500 mb-4">Enable or disable torrent search providers</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map(provider => {
          const isEnabled = (settings.enabledSources || []).includes(provider);
          return (
            <div
              key={provider}
              onClick={() => toggleProvider(provider)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                isEnabled
                  ? 'bg-primary/10 border-primary/30 text-white'
                  : 'bg-surface border-border text-gray-400 hover:border-border-active'
              }`}
            >
              <span className="text-sm font-medium">{provider}</span>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isEnabled ? 'bg-primary border-primary' : 'border-gray-600'
              }`}>
                {isEnabled && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, updateSetting, addToast } = useAppStore();
  const [activeSection, setActiveSection] = useState('connection');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(r => setSettings(r.data || {}))
      .catch(() => {});
  }, [setSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      addToast({ type: 'success', message: 'Settings saved successfully' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Configure Torrenza to your preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="card p-2 space-y-1">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">
              {SECTIONS.find(s => s.id === activeSection)?.icon}{' '}
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>

            {activeSection === 'connection' && (
              <SectionConnection settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'downloads' && (
              <SectionDownloads settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'appearance' && (
              <SectionAppearance settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'providers' && (
              <SectionProviders settings={settings} updateSetting={updateSetting} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
