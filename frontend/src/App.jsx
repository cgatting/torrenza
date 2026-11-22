import React from 'react';
import { Toaster } from 'sonner';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import useAppStore from './store/useAppStore';

function ToastContainer() {
  const { ui } = useAppStore();
  const { toasts } = ui;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`animate-bounce-in px-5 py-3 rounded-xl border shadow-card flex items-center gap-3 min-w-[280px] ${
            toast.type === 'success' ? 'bg-primary/15 border-primary/30 text-primary' :
            toast.type === 'error' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
            toast.type === 'info' ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan' :
            'bg-elevated border-border text-white'
          }`}
        >
          <span className="text-sm font-medium flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { ui } = useAppStore();
  const { activePage } = ui;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'search': return <SearchPage />;
      case 'downloads': return <DownloadsPage />;
      case 'settings': return <SettingsPage />;
      default: return <SearchPage />;
    }
  };

  return (
    <>
      <AppShell>{renderPage()}</AppShell>
      <ToastContainer />
      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        toastOptions={{
          style: { display: 'none' },
        }}
      />
    </>
  );
}
