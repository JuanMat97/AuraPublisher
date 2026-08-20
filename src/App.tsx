import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { useAppStore } from './store/appStore';
import { HeaderBar } from './components/Navigation/HeaderBar';
import { SidebarNav } from './components/Sidebar/SidebarNav';
import { LibraryView } from './components/Workspace/LibraryView';
import { MockupGridView } from './components/Workspace/MockupGridView';
import { MassPublisherView } from './components/Workspace/MassPublisherView';
import { PublishView } from './components/Workspace/PublishView';
import { PricingSettingsView } from './components/Workspace/PricingSettingsView';
import { PresetsView } from './components/Workspace/PresetsView';
import { SeoCopyView } from './components/Workspace/SeoCopyView';
import { InfographicsView } from './components/Workspace/InfographicsView';
import { UnsplashHubModal } from './components/Workspace/UnsplashHubModal';
import { InspectorPanel } from './components/Inspector/InspectorPanel';
import { HistoryDrawer } from './components/History/HistoryDrawer';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  errorText?: string;
}

class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, errorText: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AuraPublisher:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>AuraPublisher Studio Pro</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Ocurrió un error al cargar la vista. Haz clic para recargar.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Recargar Estudio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const { activeView, currentView, loadInitialStore } = useAppStore();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadInitialStore();
  }, [loadInitialStore]);

  const view = activeView || currentView || 'publisher';

  return (
    <GlobalErrorBoundary>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          overflow: 'hidden',
          background: 'var(--bg-ambient-mesh)',
          backgroundAttachment: 'fixed',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Pane: Glassmorphism Translucent Sidebar */}
        <SidebarNav />

        {/* Right Pane: Crisp White Workspace Surface with Box Shadow and Rounded Corners */}
        <div
          className="surface-workspace"
          style={{
            flex: 1,
            margin: '12px 12px 12px 0',
            borderRadius: '20px',
            background: '#ffffff',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 24px)',
            position: 'relative',
          }}
        >
          {/* Top Header inside Workspace */}
          <HeaderBar onOpenHistory={() => setShowHistory(true)} />

          {/* Main Dynamic View Content */}
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
            {view === 'library' && <LibraryView />}

            {(view === 'mockups' || (view as string) === 'studio') && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <MockupGridView />
                <InspectorPanel />
              </div>
            )}

            {view === 'publisher' && <MassPublisherView />}

            {(view as string) === 'publish' && <PublishView />}

            {view === 'pricing' && <PricingSettingsView />}

            {(view as string) === 'presets' && <PresetsView />}
            {(view as string) === 'seo' && <SeoCopyView />}
            {(view as string) === 'infographics' && <InfographicsView />}
            {(view as string) === 'unsplash' && <UnsplashHubModal />}
          </main>
        </div>

        {/* Modals & Drawers */}
        {showHistory && <HistoryDrawer onClose={() => setShowHistory(false)} />}
      </div>
    </GlobalErrorBoundary>
  );
};

export default App;
