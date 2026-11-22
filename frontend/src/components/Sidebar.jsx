import React from 'react';
import useAppStore from '../store/useAppStore';

const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Library',
    items: [
      {
        id: 'search',
        label: 'Search',
        icon: (
          <svg {...iconProps}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      },
      {
        id: 'downloads',
        label: 'Downloads',
        icon: (
          <svg {...iconProps}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const { ui, setActivePage } = useAppStore();
  const { sidebarCollapsed, activePage } = ui;

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#141216]/95 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 z-30 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
      }`}
    >
      <div className="h-[76px] flex items-center px-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f2ae6d] to-[#d96b68] flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-950/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight text-gradient leading-none">Torrenza</h1>
              <p className="text-[10px] text-gray-500 font-medium mt-1 tracking-wide">Torrent Management</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <div className="px-3 mb-2 section-label">{group.label}</div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${
                      isActive
                        ? 'bg-primary/10 text-[#f2ae6d]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="text-sm font-medium animate-fade-in">{item.label}</span>
                    )}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-1.5 bg-elevated border border-border rounded-lg text-sm font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-card">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border flex-shrink-0">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            <div className="bg-surface/80 rounded-xl p-3.5 border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </div>
                <span className="section-label">System Status</span>
              </div>
              <div className="text-sm font-semibold text-white">All systems operational</div>
              <div className="text-[11px] text-gray-500 mt-0.5">v1.0.0 · local node</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
