# Torrenza - Professional Overhaul Plan

## 1. Project Understanding

**Torrenza** is a torrent search and download management application with:
- **Frontend**: React 19 (JSX) + Tailwind CSS + Vite — served from `/frontend/`
- **Backend**: Node.js/Express on port 5000 — served from `/backend/`
- **Download Engine**: Python `libtorrent` via spawned `torrentp_worker.py`
- **Database**: PostgreSQL (schema exists but unused in current flow)
- **Active stack**: `frontend/` + `backend/` only. `/src` (TSX) and `/api/` are stale placeholders.

**Current Pain Points:**
- Basic, unpolished UI with generic Tailwind styling
- No loading skeletons or empty states — jarring transitions
- Torrent search results lack detail (no file list, no health indicator)
- Downloads page shows raw progress bars with no visual flair
- Settings page is a basic form with no real functionality
- No real-time stats dashboard
- No bandwidth/speed limiting controls in the UI
- The `src/` (TSX) and `api/` (auth) directories are dead code
- File size discrepancy between metadata and actual download (addressed in previous work)
- No mobile responsiveness

---

## 2. Overhaul Goals

1. **Premium Dark UI** — sleek, modern dark theme inspired by qBittorrent/Web、布Rocket、Infuse aesthetics
2. **Real-time Dashboard** — bandwidth usage, active peers, seed ratio, system storage
3. **Rich Search Experience** — file list preview, health score, category icons, advanced filters
4. **Polished Downloads Manager** — animated progress, chunked progress bars, torrent file tree, force recheck, bandwidth allocation
5. **Settings Revamp** — connection limits, port config, bandwidth caps, provider toggles, download path config
6. **Proper State Management** — Zustand store for global torrent state, WebSocket-ready architecture
7. **Loading/Empty/Error States** — skeleton loaders, illustrated empty states, toast notifications
8. **Responsive Design** — mobile-friendly sidebar drawer, responsive grids

---

## 3. Implementation Plan

### Phase 1: Project Cleanup & Foundation

**Step 1.1 — Clean dead code**
- Archive or remove the stale `src/` (TSX) directory and `api/` directory
- Update root `package.json` scripts to only reference `frontend/` and `backend/`
- Update root `vite.config.ts` to remove `@/` aliases pointing to `src/`

**Step 1.2 — Add required frontend dependencies**
```bash
cd frontend
npm install zustand @tanstack/react-query lucide-react clsx tailwind-merge sonner date-fns
```
- `zustand` — global state for torrents, settings, UI state
- `@tanstack/react-query` — server state management for search results
- `sonner` — toast notifications
- `date-fns` — formatting

**Step 1.3 — Set up Tailwind theme**
Update `frontend/tailwind.config.js` with a custom design system:
- Custom colors: `bg-primary`, `bg-surface`, `bg-elevated`, `border-subtle`, `text-primary`, `text-muted`
- Custom animations: `pulse-fast`, `progress-stripe`
- Custom backdrop blur classes

---

### Phase 2: Global Layout & Navigation

**Step 2.1 — AppShell component**
Create `frontend/src/components/AppShell.jsx`:
- Collapsible sidebar (icons-only collapsed, full labels expanded)
- Mobile: sidebar becomes a slide-in drawer with overlay
- Top bar: global search trigger, notification bell, connection status dot
- Main content area with scroll

**Step 2.2 — Sidebar component**
Revamp `frontend/src/components/Sidebar.jsx`:
- Logo at top with animated gradient
- Nav items with icons + labels: Dashboard, Search, Downloads, Settings
- Active indicator: animated left border + subtle glow
- Connection status indicator at bottom
- Collapse toggle button

**Step 2.3 — Zustand store**
Create `frontend/src/store/useAppStore.js`:
```js
{
  torrents: [], // active torrent list
  settings: {}, // app settings
  ui: {
    sidebarCollapsed: false,
    activePage: 'search',
    toasts: []
  }
}
```

---

### Phase 3: Dashboard Page (New)

**Step 3.1 — Dashboard layout**
Create `frontend/src/pages/DashboardPage.jsx`:
- 4 stat cards: Active Downloads, Total Speed, Seed Ratio, Storage Used
- Recent Downloads list (last 5)
- Bandwidth graph (simulated real-time line chart using CSS)
- Quick actions: Add magnet link, Resume All, Pause All

**Step 3.2 — Stat cards**
- Animated counter on load
- Color-coded icons (green=healthy, yellow=warning, red=error)
- Trend indicator (up/down arrow)

---

### Phase 4: Search Page (Full Overhaul)

**Step 4.1 — Redesign search bar**
- Oversized input with animated border glow on focus
- Integrated filter pills (All, Movies, TV, Music, Games, Software)
- Sort dropdown with icon
- Voice search icon (cosmetic)

**Step 4.2 — Result cards**
- Each result card shows:
  - Torrent name (bold, truncated with tooltip)
  - Category badge (icon + label)
  - File count and total size
  - Health indicator (green/yellow/red dot based on seeders)
  - Upload date
  - List of files (expandable accordion)
  - Download button with speed selector (Low/Med/High)
- Hover state: card lifts with shadow, download button appears
- Click on file list expands an accordion showing individual files with sizes

**Step 4.3 — Advanced filters panel**
- Collapsible panel below search bar
- Checkboxes for each provider source
- Minimum seeders filter
- Size range slider
- Date posted filter
- Codec filter (x264, x265, AV1)

**Step 4.4 — Search loading states**
- Skeleton cards (3-5 animated skeletons) during search
- Debounced search (300ms)
- "Searching N sources..." progress text

---

### Phase 5: Downloads Page (Full Overhaul)

**Step 5.1 — Download queue**
- Each torrent row shows:
  - Animated progress bar with stripe animation
  - Percentage + ETA overlay on progress bar
  - Individual file list (collapsible)
  - Peer/seed information with animated bars
  - Action buttons: Pause/Resume, Remove, Force Recheck, Set Priority
  - Hover: reveal action row with additional controls

**Step 5.2 — Batch actions toolbar**
- Floating action bar when items are selected
- Actions: Pause All, Resume All, Remove Completed, Set Download Priority

**Step 5.3 — Download details panel**
- When a torrent is selected, show a right-panel with:
  - Full file tree
  - Health/availability breakdown
  - Trackers list
  - Connection history

**Step 5.4 — Speed graph**
- Simple CSS-based bar chart showing last 60 seconds of download speed
- Upload speed below it

---

### Phase 6: Settings Page (Revamp)

**Step 6.1 — Settings categories**
- Sidebar within settings page: Connection, Downloads, Appearance, Advanced
- Each section is a full form panel

**Step 6.2 — Connection settings**
- Listen Port (with randomize button)
- Connection Limits (max peers, max seeds)
- Protocol: IPv4/IPv6/Both
- Proxy settings (type, host, port, auth)

**Step 6.3 — Download settings**
- Default download path (with folder picker)
- Speed limits (global, per-torrent override)
- Queue settings (max active, max seeding)
- File allocation (pre-allocate disk space toggle)

**Step 6.4 — Appearance settings**
- Theme toggle (Dark/Light) — Dark default
- Accent color picker (preset palette)
- Show/Hide system tray icon

---

### Phase 7: Polish & UX

**Step 7.1 — Toast notifications**
- Replace `alert()` with `sonner` toasts
- Events: download started, download complete, error, seed ratio reached

**Step 7.2 — Loading skeletons**
- Add skeleton components for all pages
- Animated shimmer effect

**Step 7.3 — Empty states**
- Illustrated SVG empty states for:
  - No search results
  - No active downloads
  - No settings configured

**Step 7.4 — Error boundaries**
- Wrap pages in React error boundaries
- Graceful degradation with retry buttons

**Step 7.5 — Animations**
- Page transitions (fade + slide)
- Staggered list item entrance animations
- Progress bar stripe animation

---

### Phase 8: Backend Improvements

**Step 8.1 — Bandwidth limiting in torrentp_worker.py**
- Accept `download_speed` and `upload_speed` parameters
- Pass these to `start_download(download_speed=X, upload_speed=Y)`

**Step 8.2 — Connection limits**
- Add `/api/settings` endpoints to update libtorrent session settings
- Pass max connections, max active downloads to libtorrent

**Step 8.3 — File list in search results**
- Update `torrents.js` to return file list from torrent metadata
- Add a `/api/torrents/details/:hash` endpoint that fetches metadata for a specific torrent

**Step 8.4 — WebSocket-ready architecture**
- Add `server.js` to use `socket.io` for real-time download progress (future-ready)

---

### Phase 9: Testing & Build

**Step 9.1 — Test suite expansion**
- Add Jest tests for all new components
- Test download state transitions
- Test search API response handling

**Step 9.2 — Build verification**
- Run `npm run build` for frontend
- Ensure no TypeScript/ESLint errors
- Test production serve

---

## 4. File Changes Summary

| File | Action |
|------|--------|
| `frontend/src/components/AppShell.jsx` | Create |
| `frontend/src/components/Sidebar.jsx` | Overhaul |
| `frontend/src/components/SkeletonCard.jsx` | Create |
| `frontend/src/components/Toast.jsx` | Create |
| `frontend/src/components/ProgressBar.jsx` | Create |
| `frontend/src/pages/DashboardPage.jsx` | Create |
| `frontend/src/pages/SearchPage.jsx` | Overhaul |
| `frontend/src/pages/DownloadsPage.jsx` | Overhaul |
| `frontend/src/pages/SettingsPage.jsx` | Overhaul |
| `frontend/src/store/useAppStore.js` | Create |
| `frontend/src/api/client.js` | Create (axios instance) |
| `frontend/tailwind.config.js` | Overhaul (custom theme) |
| `frontend/src/index.css` | Overhaul |
| `backend/src/routes/torrents.js` | Add file list endpoint |
| `backend/src/services/torrentp_worker.py` | Add bandwidth params |
| `backend/server.js` | Add socket.io placeholder |
| `src/` (TSX) | Archive/remove |
| `api/` directory | Archive/remove |

---

## 5. Execution Order

1. Cleanup dead code (Phase 1)
2. Install dependencies + Tailwind theme (Phase 1)
3. Build AppShell + Sidebar + Zustand store (Phase 2)
4. Build Dashboard page (Phase 3)
5. Overhaul Search page (Phase 4)
6. Overhaul Downloads page (Phase 5)
7. Revamp Settings page (Phase 6)
8. Add polish: toasts, skeletons, animations (Phase 7)
9. Backend improvements (Phase 8)
10. Test + build verification (Phase 9)
