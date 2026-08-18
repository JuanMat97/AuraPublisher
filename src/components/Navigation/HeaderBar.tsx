import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Folder, History, UploadCloud, RefreshCw } from 'lucide-react';
import { processFileToSelectedImage } from '../../utils/imageLoader';

interface HeaderBarProps {
  onOpenHistory?: () => void;
  onOpenPresets?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenHistory, onOpenPresets }) => {
  const { selectedImage, setSelectedImage, outputFolder, history, setCurrentView } = useAppStore();

  const handleOpenImage = () => {
    if (window.electronAPI) {
      window.electronAPI.openImage().then((img) => {
        if (img) setSelectedImage(img);
      });
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const img = await processFileToSelectedImage(file);
          setSelectedImage(img);
        }
      };
      fileInput.click();
    }
  };

  const handleOpenFolder = () => {
    if (window.electronAPI) {
      window.electronAPI.selectFolder().then((folder: string | null) => {
        if (folder) useAppStore.getState().setOutputFolder(folder);
      });
    }
  };

  const handleHistoryClick = () => {
    if (onOpenHistory) onOpenHistory();
    else setCurrentView('presets');
  };

  return (
    <header style={{
      height: '56px',
      background: 'rgba(12, 15, 22, 0.75)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #de2367, #be185d)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px var(--accent-primary-glow)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#ffffff' }}>
            A
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            AuraPublisher
          </span>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
            STUDIO PRO
          </span>
        </div>
      </div>

      {/* Center Breadcrumb / Load Artwork Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {selectedImage ? (
          <button
            onClick={handleOpenImage}
            title="Hacé clic para cambiar la obra cargada"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <RefreshCw size={12} color="var(--accent-primary)" />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Obra:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedImage.filename}
            </span>
            {selectedImage.width && selectedImage.height && (
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(222, 35, 103, 0.15)', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedImage.width}×{selectedImage.height}px
              </span>
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleOpenImage}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
          >
            <UploadCloud size={14} />
            <span>Cargar Obra Principal</span>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-primary"
          onClick={handleOpenImage}
          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
        >
          <UploadCloud size={13} />
          <span>{selectedImage ? 'Cambiar Obra' : 'Cargar Obra'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleHistoryClick}
          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
        >
          <History size={13} />
          <span>Historial ({history.length})</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleOpenFolder}
          title={outputFolder}
          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
        >
          <Folder size={13} color="var(--accent-primary)" />
          <span>Carpeta</span>
        </button>
      </div>
    </header>
  );
};
