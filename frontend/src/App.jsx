import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import useAppStore from './store/useAppStore';
import './App.css';

const accents = {
  '#e89557': '158 72 25',
  '#4CAF50': '34 112 61',
  '#00D9FF': '4 104 124',
  '#A855F7': '83 66 184',
  '#7056d0': '83 66 184',
  '#F59E0B': '139 86 11',
};

function ToastContainer() {
  const { ui, removeToast } = useAppStore();
  return (
    <div className="toast-stack">
      {ui.toasts.map(toast => {
        const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'success' ? CheckCircle2 : Info;
        return <div className="workspace-toast" key={toast.id} data-tone={toast.type}>
          <Icon size={18} />
          <span role={toast.type === 'error' ? 'alert' : 'status'}>{toast.message}</span>
          <button className="btn-icon" aria-label="Dismiss notification" onClick={() => removeToast(toast.id)}><X size={16} /></button>
        </div>;
      })}
    </div>
  );
}

export default function App() {
  const page = useAppStore(state => state.ui.activePage);
  const accent = useAppStore(state => state.settings.accentColor);

  return (
    <div style={accents[accent] ? { '--accent': accents[accent] } : undefined}>
      <AppShell>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'downloads' && <DownloadsPage />}
        {page === 'settings' && <SettingsPage />}
        <div hidden={page !== 'search'}><SearchPage /></div>
      </AppShell>
      <ToastContainer />
    </div>
  );
}
