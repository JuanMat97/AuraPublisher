import React from 'react';
import { useAppStore, StudioView } from '../../store/appStore';
import { Folder, History, UploadCloud, Check, Sparkles, Sliders } from 'lucide-react';
import { processFileToSelectedImage } from '../../utils/imageLoader';

interface HeaderBarProps {
  onOpenHistory?: () => void;
  onOpenPresets?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenHistory }) => {
  const {
    selectedImage,
    setSelectedImage,
    outputFolder,
    history,
    activeView,
    currentView,
    setActiveView,
    setCurrentView,
    currentStep,
    setCurrentStep,
  } = useAppStore();

  const current = activeView || currentView || 'publisher';
  const handleSelectView = (view: StudioView) => {
    if (setActiveView) setActiveView(view);
    else setCurrentView(view);
  };

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
  };

  return (
    <header
      style={{
        height: '56px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Left: Active View Breadcrumb / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            {current === 'library' && 'Biblioteca de Diseños'}
            {current === 'mockups' && 'Studio Mockups 3D'}
            {current === 'publisher' && 'Publicador MercadoLibre'}
            {current === 'pricing' && 'Gestor de Precios & Variantes'}
          </span>

          {selectedImage ? (
            <span className="pill pill-green" style={{ fontSize: '10px' }}>
              <Check size={10} />
              {selectedImage.filename.length > 24
                ? selectedImage.filename.substring(0, 24) + '...'
                : selectedImage.filename}
            </span>
          ) : (
            <span className="pill pill-amber" style={{ fontSize: '10px' }}>
              Sin obra activa
            </span>
          )}
        </div>
      </div>

      {/* Center: Publication Workflow Stepper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '2px 4px',
          gap: '2px',
        }}
      >
        {/* Step 1: Biblioteca */}
        <button
          onClick={() => handleSelectView('library')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            background: current === 'library' ? '#ffffff' : 'transparent',
            color: current === 'library' ? '#0284c7' : '#64748b',
            boxShadow: current === 'library' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            fontSize: '11px',
            fontWeight: current === 'library' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          <span>1. Biblioteca</span>
        </button>

        <span style={{ color: '#cbd5e1', fontSize: '10px' }}>›</span>

        {/* Step 2: Mockups */}
        <button
          onClick={() => {
            setCurrentStep(2);
            handleSelectView('mockups');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            background: current === 'mockups' ? '#ffffff' : 'transparent',
            color: current === 'mockups' ? '#0284c7' : '#64748b',
            boxShadow: current === 'mockups' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            fontSize: '11px',
            fontWeight: current === 'mockups' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          <span>2. Mockups</span>
        </button>

        <span style={{ color: '#cbd5e1', fontSize: '10px' }}>›</span>

        {/* Step 3: Publicador */}
        <button
          onClick={() => {
            setCurrentStep(3);
            handleSelectView('publisher');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            background: current === 'publisher' ? '#ffffff' : 'transparent',
            color: current === 'publisher' ? '#0284c7' : '#64748b',
            boxShadow: current === 'publisher' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            fontSize: '11px',
            fontWeight: current === 'publisher' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          <span>3. Publicador ML</span>
        </button>

        <span style={{ color: '#cbd5e1', fontSize: '10px' }}>›</span>

        {/* Step 4: Precios */}
        <button
          onClick={() => handleSelectView('pricing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '7px',
            border: 'none',
            background: current === 'pricing' ? '#ffffff' : 'transparent',
            color: current === 'pricing' ? '#0284c7' : '#64748b',
            boxShadow: current === 'pricing' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            fontSize: '11px',
            fontWeight: current === 'pricing' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          <span>4. Precios</span>
        </button>
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
          <Folder size={13} color="#3b82f6" />
          <span>Carpeta</span>
        </button>
      </div>
    </header>
  );
};

