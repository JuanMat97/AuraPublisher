import React from 'react';
import { useAppStore, StudioView } from '../../store/appStore';
import { FolderArchive, Image as ImageIcon, Rocket, Sliders, Sparkles, User } from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const {
    activeView,
    currentView,
    setActiveView,
    setCurrentView,
    selectedSizes,
    environments,
    libraryCount,
  } = useAppStore();

  const current = activeView || currentView || 'publisher';
  const handleSelectView = (view: StudioView) => {
    if (setActiveView) setActiveView(view);
    else setCurrentView(view);
  };

  const navItems: Array<{ id: StudioView; label: string; icon: React.ReactNode; badge?: string; badgeType?: string }> = [
    {
      id: 'library',
      label: 'Biblioteca',
      icon: <FolderArchive size={18} />,
      badge: String(libraryCount || 313),
    },
    {
      id: 'mockups',
      label: 'Mockups 3D',
      icon: <ImageIcon size={18} />,
      badge: String(environments?.length || 12),
    },
    {
      id: 'publisher',
      label: 'Publicador ML',
      icon: <Rocket size={18} />,
      badge: String(selectedSizes?.length || 4),
    },
    {
      id: 'pricing',
      label: 'Precios',
      icon: <Sliders size={18} />,
    },
  ];

  return (
    <nav
      className="glass-sidebar"
      style={{
        width: '250px',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.25)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* App Header & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 6px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(236, 72, 153, 0.45)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} color="#ffffff" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                AuraPublisher
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.22)',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  letterSpacing: '0.06em',
                }}
              >
                STUDIO PRO
              </span>
            </div>
          </div>
        </div>

        {/* Section "MENU" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'rgba(255, 255, 255, 0.65)',
              padding: '0 10px',
              marginBottom: '6px',
            }}
          >
            MENU
          </span>

          {navItems.map((item) => {
            const isActive = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  textAlign: 'left',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#ffffff', opacity: isActive ? 1 : 0.85, display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: '#ffffff',
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.22)',
                      color: isActive ? '#3b82f6' : '#ffffff',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom User Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.14)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
          }}
        >
          <User size={16} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Aura Studio
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            admin@aurastudio.com
          </span>
        </div>
      </div>
    </nav>
  );
};

