import React from 'react';
import { useAppStore } from '../../store/appStore';
import { X, FolderOpen, Clock, Layers } from 'lucide-react';

interface HistoryDrawerProps {
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ onClose }) => {
  const { history, outputFolder } = useAppStore();

  const handleOpenFolder = (folderPath?: string) => {
    const target = folderPath || outputFolder;
    if (window.electronAPI) window.electronAPI.openPath(target);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '420px',
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(32px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 700 }}>
            <Clock size={13} />
            <span>HISTORIAL DE GENERACIONES</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f0f0f0' }}>
            Renders Anteriores ({history.length})
          </h2>
        </div>
        <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
          <X size={16} />
        </button>
      </div>

      {/* History List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#606070' }}>
            <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '13px' }}>Aún no generaste ningún set de mockups.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="light-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f0' }}>
                  {item.artworkName}
                </h4>
                <span className="pill-badge pill-mint" style={{ fontSize: '10px' }}>
                  {item.imagesCount} fotos
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#a0a0b0' }}>
                📅 {new Date(item.timestamp).toLocaleString()}
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => handleOpenFolder(item.outputFolder)}
                style={{ fontSize: '11px', padding: '6px', marginTop: '4px' }}
              >
                <FolderOpen size={12} />
                <span>Abrir Carpeta</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
