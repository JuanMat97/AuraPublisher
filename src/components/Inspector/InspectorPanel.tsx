import React from 'react';
import { useAppStore } from '../../store/appStore';
import {
  CATALOG_SIZES,
  CATALOG_VINYLS,
  VinylFinish,
} from '../../types/catalog';
import { FrostedDropdown } from '../UI/FrostedDropdown';
import { Live3DViewport } from './Live3DViewport';
import { generateFullMockupSet } from '../../engine/compositor';
import { loadImageElement, processFileToSelectedImage } from '../../utils/imageLoader';
import { Sparkles, Plus, Flame, Sliders, ArrowLeft, ArrowRight, Upload } from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const {
    selectedImage,
    artworkSlots,
    setSlotArtwork,
    swapArtworkSlots,
    productConfig,
    setProductConfig,
    environments,
    selectedPositions,
    outputFolder,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
    setGeneratedItems,
    addHistoryItem,
  } = useAppStore();

  const currentSize = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const panelsCount = currentSize.panelsCount || 1;

  const sizeOptions = CATALOG_SIZES.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  const handleSelectSlotImage = (slotIndex: number) => {
    if (window.electronAPI) {
      window.electronAPI.openImage().then((img) => {
        if (img) setSlotArtwork(slotIndex, img);
      });
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const img = await processFileToSelectedImage(file);
          setSlotArtwork(slotIndex, img);
        }
      };
      fileInput.click();
    }
  };

  const handleSlotDrop = async (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const img = await processFileToSelectedImage(e.dataTransfer.files[0]);
      setSlotArtwork(slotIndex, img);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: selectedPositions.length, message: 'Iniciando composición de mockups...' });

    try {
      const img = await loadImageElement(selectedImage.path);

      const items = await generateFullMockupSet({
        artworkImage: img,
        artworkSlots,
        productConfig,
        environments,
        selectedPositions,
        onProgress: (current, total, message) => {
          setGenerationProgress({ current, total, message });
        },
      });

      setGeneratedItems(items);

      const savedPaths: string[] = [];
      const artworkName = productConfig.title || selectedImage.filename;
      const targetDir = `${outputFolder}\\${artworkName.replace(/[^a-zA-Z0-9]/g, '_')}`;

      for (const item of items) {
        if (window.electronAPI) {
          const filePath = `${targetDir}\\${item.targetFilename}`;
          const res = await window.electronAPI.saveBase64({
            base64Data: item.base64,
            targetPath: filePath,
            quality: 92,
          });
          if (res.success && res.path) savedPaths.push(res.path);
        }
      }

      addHistoryItem({
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        artworkName,
        imagesCount: items.length,
        outputFolder: targetDir,
        productConfig,
        files: savedPaths,
      });
    } catch (e: any) {
      console.error('Generation failed:', e);
      alert('Error en la generación: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <aside style={{
      width: '350px',
      height: 'calc(100vh - 56px)',
      overflowY: 'auto',
      padding: '20px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: 'rgba(10, 13, 20, 0.70)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      {/* 0. Obra Principal */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '14px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
            Obra Principal
          </span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: selectedImage ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)', color: selectedImage ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
            {selectedImage ? 'Cargada' : 'Sin Imagen'}
          </span>
        </div>

        {selectedImage ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              <img src={selectedImage.path} alt={selectedImage.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedImage.filename}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {selectedImage.width && selectedImage.height ? `${selectedImage.width}×${selectedImage.height}px` : 'Imagen HD'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px' }}>
            No hay ninguna obra seleccionada
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => handleSelectSlotImage(0)}
          style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '10px' }}
        >
          <Upload size={13} />
          <span>{selectedImage ? 'Cambiar Imagen' : 'Cargar Archivo de Imagen'}</span>
        </button>
      </div>

      {/* Visor 3D Interactivo */}
      <Live3DViewport />

      {/* 1. Product Size & Format */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
            1. Formato & Medida
          </span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(222, 35, 103, 0.15)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {panelsCount > 1 ? `Set de ${panelsCount}` : 'Panel Único'}
          </span>
        </div>

        {/* Custom Frosted Dark Dropdown */}
        <FrostedDropdown
          options={sizeOptions}
          value={productConfig.sizeId}
          onChange={(val) => setProductConfig({ sizeId: val })}
        />

        {/* Multi-Artwork Slots for Set Mode */}
        {panelsCount > 1 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Modo de Set:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setProductConfig({ setMode: 'collection' })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: productConfig.setMode === 'collection' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Colección
                </button>
                <button
                  onClick={() => setProductConfig({ setMode: 'split' })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: productConfig.setMode === 'split' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Dividir
                </button>
              </div>
            </div>

            {productConfig.setMode === 'collection' && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${panelsCount}, 1fr)`, gap: '8px' }}>
                {Array.from({ length: panelsCount }).map((_, idx) => {
                  const slotImg = artworkSlots[idx] || (idx === 0 ? selectedImage : null);
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        onClick={() => handleSelectSlotImage(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleSlotDrop(e, idx)}
                        style={{
                          height: '75px',
                          borderRadius: '10px',
                          border: slotImg ? '1.5px solid var(--accent-primary)' : '1px dashed rgba(255,255,255,0.2)',
                          background: slotImg ? '#000' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {slotImg ? (
                          <img src={slotImg.path} alt={`Panel ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', padding: '4px' }}>
                            <Upload size={14} style={{ margin: '0 auto 2px', opacity: 0.6 }} />
                            <span>Cargar {idx + 1}</span>
                          </div>
                        )}
                        <span style={{ position: 'absolute', bottom: '3px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Reorder Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        {idx > 0 && (
                          <button
                            onClick={() => swapArtworkSlots(idx, idx - 1)}
                            title="Mover a la izquierda"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#cbd5e1',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ArrowLeft size={10} />
                          </button>
                        )}
                        {idx < panelsCount - 1 && (
                          <button
                            onClick={() => swapArtworkSlots(idx, idx + 1)}
                            title="Mover a la derecha"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#cbd5e1',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Acabado del Vinilo */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '10px' }}>
          2. Acabado del Vinilo
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {CATALOG_VINYLS.map((vin) => {
            const isSel = productConfig.vinylFinish === vin.id;
            return (
              <button
                key={vin.id}
                onClick={() => setProductConfig({ vinylFinish: vin.id as VinylFinish })}
                style={{
                  padding: '10px 4px',
                  borderRadius: '10px',
                  background: isSel ? 'rgba(222, 35, 103, 0.16)' : 'rgba(255,255,255,0.04)',
                  color: isSel ? '#ffffff' : '#94a3b8',
                  border: isSel ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                  fontSize: '11px',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: '14px' }}>{vin.id === 'mate' ? '🌑' : vin.id === 'brillante' ? '⚪' : '🔮'}</span>
                <span>{vin.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Switch Resina Epoxi */}
      <div
        onClick={() => setProductConfig({ hasResina: !productConfig.hasResina })}
        style={{
          padding: '16px',
          borderRadius: '16px',
          background: productConfig.hasResina ? 'rgba(222, 35, 103, 0.10)' : 'rgba(255, 255, 255, 0.03)',
          border: productConfig.hasResina ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: productConfig.hasResina ? 'linear-gradient(135deg, #de2367, #be185d)' : 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}>
            <Flame size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
              Resina Epoxi (Vidrio Líquido)
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Capa espejo 3D de alto brillo
            </div>
          </div>
        </div>

        <div style={{
          width: '38px',
          height: '20px',
          borderRadius: '10px',
          background: productConfig.hasResina ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.14)',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#ffffff',
            position: 'absolute',
            top: '2px',
            left: productConfig.hasResina ? '20px' : '2px',
            transition: 'all 0.2s ease',
          }} />
        </div>
      </div>

      {/* Info Tip */}
      <div style={{
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#94a3b8',
        fontSize: '11px',
      }}>
        <Sliders size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <span>Para ajustar perspectiva, sombras, reflejos o colores, hacé clic en <strong>Calibrar</strong> en cada mockup.</span>
      </div>

      {/* Action Button */}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <button
          className="btn btn-primary"
          disabled={!selectedImage || isGenerating || selectedPositions.length === 0}
          onClick={handleGenerate}
          style={{ width: '100%', padding: '14px', fontSize: '13px', borderRadius: '14px' }}
        >
          {isGenerating ? (
            <span>Generando {selectedPositions.length} Renders...</span>
          ) : selectedPositions.length === 0 ? (
            <span>Seleccioná al menos 1 Mockup</span>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Exportar {selectedPositions.length === 1 ? '1 Mockup' : `${selectedPositions.length} Mockups`} (1920×1920)</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
