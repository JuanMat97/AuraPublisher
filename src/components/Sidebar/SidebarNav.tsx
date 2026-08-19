import React from 'react';
import { useAppStore, StudioView } from '../../store/appStore';
import { LayoutGrid, FileText, BarChart2, Globe, Bookmark, FileSpreadsheet } from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const { currentView, setCurrentView, presets } = useAppStore();

  const navItems: Array<{ id: StudioView; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'studio', label: 'Studio Mockups', icon: <LayoutGrid size={18} /> },
    { id: 'publish', label: 'Publicación ML', icon: <FileSpreadsheet size={18} />, badge: 'PASO 3' },
    { id: 'seo', label: 'Ficha & SEO ML', icon: <FileText size={18} />, badge: 'IA' },
    { id: 'infographics', label: 'Infografías ML', icon: <BarChart2 size={18} /> },
    { id: 'unsplash', label: 'Hub Unsplash', icon: <Globe size={18} /> },
    { id: 'presets', label: 'Presets', icon: <Bookmark size={18} />, badge: String(presets.length) },
  ];

  return (
    <nav style={{
      width: '240px',
      height: 'calc(100vh - 56px)',
      background: 'rgba(10, 13, 20, 0.70)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* Top Menu Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: '#64748b', padding: '0 8px', marginBottom: '4px' }}>
          SUITE DE PUBLICACIÓN
        </span>

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                background: isActive ? 'var(--accent-primary-subtle)' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: isActive ? 'var(--accent-primary)' : '#94a3b8' }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500 }}>
                  {item.label}
                </span>
              </div>

              {item.badge && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Version Tag */}
      <div style={{ padding: '8px 12px', color: '#64748b', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>AuraStudio Pro</span>
        <span>v1.0 Portable</span>
      </div>
    </nav>
  );
};
