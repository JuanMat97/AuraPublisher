import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { useAppStore } from './store/appStore';
import { HeaderBar } from './components/Navigation/HeaderBar';
import { SidebarNav } from './components/Sidebar/SidebarNav';
import { MockupGridView } from './components/Workspace/MockupGridView';
import { UnsplashHubModal } from './components/Workspace/UnsplashHubModal';
import { InfographicsView } from './components/Workspace/InfographicsView';
import { SeoCopyView } from './components/Workspace/SeoCopyView';
import { PublishView } from './components/Workspace/PublishView';
import { PresetsView } from './components/Workspace/PresetsView';
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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#f0f0f0', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#d4a853' }}>AuraPublisher Studio Pro</h2>
          <p style={{ color: '#a0a0b0', fontSize: '13px' }}>Ocurrió un error al cargar la vista. Haz clic para recargar.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: '8px 16px', background: '#d4a853', color: '#0a0a0f', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
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
  const { currentView, loadInitialStore } = useAppStore();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadInitialStore();
  }, [loadInitialStore]);

  return (
    <GlobalErrorBoundary>
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}>
        {/* Top Header Window Bar */}
        <HeaderBar
          onOpenHistory={() => setShowHistory(true)}
          onOpenPresets={() => {}}
        />

        {/* 3-Pane Studio Workspace Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Pane: Translucent Sidebar */}
          <SidebarNav />

          {/* Center Pane: Dynamic Workspace Canvas */}
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {currentView === 'studio' && <MockupGridView />}
            {currentView === 'publish' && <PublishView />}
            {currentView === 'unsplash' && <UnsplashHubModal />}
            {currentView === 'infographics' && <InfographicsView />}
            {currentView === 'seo' && <SeoCopyView />}
            {currentView === 'presets' && <PresetsView />}
          </main>

          {/* Right Pane: 3D Orbit Viewport & ML Inspector (Only in Studio View) */}
          {currentView === 'studio' && <InspectorPanel />}
        </div>

        {/* Modals & Drawers */}
        {showHistory && <HistoryDrawer onClose={() => setShowHistory(false)} />}
      </div>
    </GlobalErrorBoundary>
  );
};

export default App;
