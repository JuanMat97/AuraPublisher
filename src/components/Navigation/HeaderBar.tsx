import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Folder, History, UploadCloud, RefreshCw, Check } from 'lucide-react';
import { processFileToSelectedImage } from '../../utils/imageLoader';

interface HeaderBarProps {
  onOpenHistory?: () => void;
  onOpenPresets?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenHistory, onOpenPresets }) => {
  const {
    selectedImage,
    setSelectedImage,
    outputFolder,
    history,
    currentView,
    setCurrentView,
    currentStep,
    setCurrentStep,
  } = useAppStore();

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

      {/* Center 4-Step Publication Workflow Stepper */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '3px 4px',
        gap: '4px',
      }}>
        {/* Step 1: Cargar */}
        <button
          onClick={handleOpenImage}
          title={selectedImage ? `Obra: ${selectedImage.filename}` : 'Cargar obra principal'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: currentStep === 1 ? '1px solid var(--accent-primary)' : '1px solid transparent',
            background: currentStep === 1 ? 'var(--accent-primary-subtle)' : selectedImage ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            color: selectedImage ? '#34d399' : '#cbd5e1',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <UploadCloud size={12} color={selectedImage ? '#34d399' : 'currentColor'} />
          <span>1. {selectedImage ? 'Cargado' : 'Cargar'}</span>
          {selectedImage && <Check size={10} color="#34d399" />}
        </button>

        <span style={{ color: '#475569', fontSize: '10px' }}>›</span>

        {/* Step 2: Mockups */}
        <button
          onClick={() => {
            setCurrentStep(2);
            setCurrentView('studio');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: currentStep === 2 && currentView === 'studio' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            background: currentStep === 2 && currentView === 'studio' ? 'var(--accent-primary-subtle)' : 'transparent',
            color: currentStep === 2 && currentView === 'studio' ? '#ffffff' : '#94a3b8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>2. Mockups</span>
        </button>

        <span style={{ color: '#475569', fontSize: '10px' }}>›</span>

        {/* Step 3: Publicar */}
        <button
          onClick={() => {
            setCurrentStep(3);
            setCurrentView('publish');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: currentView === 'publish' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            background: currentView === 'publish' ? 'var(--accent-primary-subtle)' : 'transparent',
            color: currentView === 'publish' ? '#ffffff' : '#94a3b8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>3. Publicar</span>
          <span style={{
            fontSize: '8px',
            fontWeight: 800,
            padding: '1px 4px',
            borderRadius: '4px',
            background: 'rgba(222, 35, 103, 0.2)',
            color: 'var(--accent-primary)',
          }}>
            ML
          </span>
        </button>

        <span style={{ color: '#475569', fontSize: '10px' }}>›</span>

        {/* Step 4: Exportar */}
        <button
          onClick={() => {
            setCurrentStep(4);
            setCurrentView('publish');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: currentStep === 4 ? '1px solid var(--accent-primary)' : '1px solid transparent',
            background: currentStep === 4 ? 'var(--accent-primary-subtle)' : 'transparent',
            color: currentStep === 4 ? '#ffffff' : '#94a3b8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>4. Exportar</span>
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
          <Folder size={13} color="var(--accent-primary)" />
          <span>Carpeta</span>
        </button>
      </div>
    </header>
  );
};
