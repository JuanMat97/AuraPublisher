import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { EnvironmentScene } from '../../types/environment';
import { CanvaMoldEditorModal } from '../EnvironmentEditor/CanvaMoldEditorModal';
import { renderSmartMoldComposite } from '../../engine/smartMoldEngine';
import { renderFramedCanvas } from '../../engine/frameRenderer';
import { getReflectionTypeForEnvironment } from '../../engine/webglRoomEngine';
import { processFileToSelectedImage, getSampleArtwork, loadImageElement } from '../../utils/imageLoader';
import { CATALOG_SIZES } from '../../types/catalog';
import { Check, CheckSquare, Square, UploadCloud, Sparkles, Image as ImageIcon, Sliders, PlusCircle, Trash2, ArrowLeft, ArrowRight, Star } from 'lucide-react';

const thumbnailCache = new Map<string, HTMLCanvasElement>();

export const clearThumbnailCache = () => thumbnailCache.clear();

const MockupCardPreview: React.FC<{
  env: EnvironmentScene;
  artworkPath?: string;
  artworkSlots: any[];
  setMode: string;
  vinylFinish: any;
  hasResina: boolean;
  lightMode: any;
  sizeId: string;
  panelsCount: number;
}> = ({ env, artworkPath, artworkSlots, setMode, vinylFinish, hasResina, lightMode, sizeId, panelsCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = env.positions[0];
    const adjustKey = pos?.adjust ? JSON.stringify(pos.adjust) : 'default';
    const slotsKey = artworkSlots.map((s) => s?.filename || 'none').join('|');
    const cacheKey = `${env.id}:${pos?.wallAngle}:${pos?.pitchDeg}:${pos?.rollDeg}:${pos?.thicknessCm}:${pos?.zDistance}:${pos?.reflectionType}:${pos?.reflectionAngleDeg}:${pos?.reflectionIntensity}:${pos?.reflectionBrightness}:${pos?.reflectionContrast}:${pos?.shadowPreset}:${pos?.shadowBlur}:${pos?.shadowStyleIntensity}:${pos?.wallHarmonization}:${adjustKey}:${artworkPath || 'default'}:${slotsKey}:${setMode}:${vinylFinish}:${hasResina}:${lightMode}:${sizeId}`;
    if (thumbnailCache.has(cacheKey)) {
      const cached = thumbnailCache.get(cacheKey)!;
      canvas.width = cached.width;
      canvas.height = cached.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(cached, 0, 0);
      return;
    }

    const renderPreview = async () => {
      try {
        const envImg = await loadImageElement(env.imageUrl);
        const framedArtworks: HTMLCanvasElement[] = [];

        for (let i = 0; i < panelsCount; i++) {
          let artSource = artworkPath || getSampleArtwork('abstract').path;
          if (setMode === 'collection' && artworkSlots[i]) {
            artSource = artworkSlots[i].path;
          }
          const loadedImg = await loadImageElement(artSource);

          const framed = renderFramedCanvas({
            artworkImage: loadedImg,
            frameType: 'wrap_1cm',
            finishType: vinylFinish,
            panelConfig: 'single',
            targetWidth: 480,
          });
          framedArtworks.push(framed);
        }

        if (!alive) return;

        const centerX = pos?.quad ? (pos.quad.topLeft.x + pos.quad.topRight.x) / 2 : 0.5;
        const centerY = pos?.quad ? (pos.quad.topLeft.y + pos.quad.bottomLeft.y) / 2 : 0.32;
        const scaleWidth = pos?.quad ? Math.abs(pos.quad.topRight.x - pos.quad.topLeft.x) : 0.42;

        const composite = renderSmartMoldComposite({
          envImage: envImg,
          framedArtworks,
          mold: {
            centerX,
            centerY,
            scaleWidth,
            fitMode: 'contain',
            lightMode,
            vinylFinish,
            hasResina,
            reflectionType: pos?.reflectionType ?? getReflectionTypeForEnvironment(env.category),
            reflectionIntensity: pos?.reflectionIntensity ?? 0.2,
            reflectionScale: pos?.reflectionScale ?? 1.0,
            reflectionRoughness: pos?.reflectionRoughness ?? 0.08,
            reflectionAngleDeg: pos?.reflectionAngleDeg ?? 0,
            reflectionBrightness: pos?.reflectionBrightness,
            reflectionContrast: pos?.reflectionContrast,
            weatherPreset: pos?.weatherPreset,
            wallHarmonization: pos?.wallHarmonization ?? 0.35,
            wallAngle: pos?.wallAngle ?? 0,
            pitchDeg: pos?.pitchDeg ?? 0,
            rollDeg: pos?.rollDeg ?? 0,
            thicknessCm: pos?.thicknessCm ?? 1.0,
            zDistance: pos?.zDistance ?? 0,
            shelfContactShadow: pos?.shelfContactShadow,
            shadowPreset: pos?.shadowPreset,
            shadowBlur: pos?.shadowBlur,
            shadowIntensity: pos?.shadowStyleIntensity,
            adjust: pos?.adjust,
          },
          canvasWidth: 480,
          canvasHeight: 300,
        });

        thumbnailCache.set(cacheKey, composite);

        if (!alive) return;
        canvas.width = 480;
        canvas.height = 300;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(composite, 0, 0);
      } catch (err) {
        console.error('Error rendering card preview:', err);
      }
    };

    renderPreview();
    return () => { alive = false; };
  }, [env, artworkPath, artworkSlots, setMode, vinylFinish, hasResina, lightMode, sizeId, panelsCount]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};

export const MockupGridView: React.FC = () => {
  const {
    selectedImage,
    setSelectedImage,
    artworkSlots,
    environments,
    addCustomEnvironment,
    deleteEnvironment,
    moveEnvironment,
    setEnvironmentAsCover,
    selectedPositions,
    togglePosition,
    selectAllPositions,
    clearPositions,
    productConfig,
  } = useAppStore();

  const [editingEnv, setEditingEnv] = useState<EnvironmentScene | null>(null);
  const [isDropHovered, setIsDropHovered] = useState(false);

  const sizeOpt = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const panelsCount = sizeOpt.panelsCount || 1;

  // Selected environments in the current sequence
  const selectedEnvs = environments.filter((e) => selectedPositions.some((p) => p.envId === e.id));

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const img = await processFileToSelectedImage(e.dataTransfer.files[0]);
      setSelectedImage(img);
    }
  };

  const handleAddCustomEnvironment = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const img = await processFileToSelectedImage(file);
        const newEnv: EnvironmentScene = {
          id: 'custom_env_' + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: 'living',
          imageUrl: img.path,
          positions: [
            {
              id: 'pos_' + Date.now(),
              name: 'Pared Principal',
              quad: {
                topLeft: { x: 0.28, y: 0.16 },
                topRight: { x: 0.72, y: 0.16 },
                bottomRight: { x: 0.72, y: 0.48 },
                bottomLeft: { x: 0.28, y: 0.48 },
              },
              shadowIntensity: 0.6,
            },
          ],
          isCustom: true,
        };
        addCustomEnvironment(newEnv);
        setEditingEnv(newEnv);
      }
    };
    fileInput.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDropHovered(true); }}
      onDragLeave={() => setIsDropHovered(false)}
      onDrop={handleGlobalDrop}
      style={{
        flex: 1,
        padding: '24px 28px',
        overflowY: 'auto',
        height: 'calc(100vh - 56px)',
        background: 'transparent',
        position: 'relative',
      }}
    >
      {/* Global Drag & Drop Overlay Indicator */}
      {isDropHovered && (
        <div style={{
          position: 'absolute',
          top: '16px', left: '16px', right: '16px', bottom: '16px',
          background: 'rgba(10, 13, 20, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '2px dashed var(--accent-primary)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          color: '#ffffff',
          pointerEvents: 'none',
        }}>
          <UploadCloud size={56} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Soltá tu obra aquí</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
            Se cargará automáticamente en todos los moldes 3D
          </p>
        </div>
      )}

      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Studio de Mockups en Pared
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: selectedEnvs.length > 0 ? 'rgba(222, 35, 103, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              border: selectedEnvs.length > 0 ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: selectedEnvs.length > 0 ? '#ff6496' : '#94a3b8',
            }}>
              {selectedEnvs.length === 1 ? '1 foto seleccionada' : `${selectedEnvs.length} fotos seleccionadas para exportar`}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {sizeOpt.name} — Vinilo {productConfig.vinylFinish.toUpperCase()} {productConfig.hasResina ? '+ RESINA EPOXI' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
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
            }}
            style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px' }}
          >
            <UploadCloud size={14} />
            <span>{selectedImage ? 'Cambiar Obra' : 'Cargar Obra'}</span>
          </button>
          <button className="btn btn-secondary" onClick={handleAddCustomEnvironment} style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px' }}>
            <PlusCircle size={14} />
            <span>Añadir Mockup IA</span>
          </button>
          <button className="btn btn-secondary" onClick={selectAllPositions} style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}>
            <CheckSquare size={13} />
            <span>Marcar Todos</span>
          </button>
          <button className="btn btn-secondary" onClick={clearPositions} style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}>
            <Square size={13} />
            <span>Desmarcar</span>
          </button>
        </div>
      </div>

      {/* Quick Sampler Banner when no image is loaded */}
      {!selectedImage && (
        <div
          style={{
            padding: '28px',
            textAlign: 'center',
            marginBottom: '24px',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <UploadCloud size={36} color="var(--accent-primary)" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            Arrastrá una obra aquí para verla montada en todos los ambientes
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px' }}>
            O seleccioná una muestra rápida:
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedImage(getSampleArtwork('abstract'))} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}>
              <Sparkles size={12} color="var(--accent-primary)" />
              <span>Abstracto Dorado (1:1)</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedImage(getSampleArtwork('portrait'))} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}>
              <ImageIcon size={12} />
              <span>Geométrico (3:4)</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedImage(getSampleArtwork('landscape'))} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}>
              <ImageIcon size={12} />
              <span>Panorámico Océano (16:9)</span>
            </button>
          </div>
        </div>
      )}

      {/* Mockups Grid Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
        {environments.map((env, index) => {
          const selectedIndex = selectedEnvs.findIndex((e) => e.id === env.id);
          const isSelected = selectedIndex >= 0;
          const isFirst = index === 0;
          const isLast = index === environments.length - 1;

          return (
            <div
              key={env.id}
              style={{
                padding: '12px',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: isSelected ? 'rgba(222, 35, 103, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Image Preview Container */}
              <div style={{ position: 'relative', height: '185px', borderRadius: '10px', overflow: 'hidden', background: '#05060a' }}>
                <MockupCardPreview
                  env={env}
                  artworkPath={selectedImage?.path}
                  artworkSlots={artworkSlots}
                  setMode={productConfig.setMode}
                  vinylFinish={productConfig.vinylFinish}
                  hasResina={productConfig.hasResina}
                  lightMode={productConfig.lightMode}
                  sizeId={productConfig.sizeId}
                  panelsCount={panelsCount}
                />

                {/* Badges: Live Photo Numbering */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 5 }}>
                  {isSelected ? (
                    selectedIndex === 0 ? (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #de2367, #e11d48)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(222, 35, 103, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <Star size={11} fill="#ffffff" />
                        <span>Foto 01: Portada ML</span>
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#f8fafc',
                      }}>
                        Foto {String(selectedIndex + 1).padStart(2, '0')}: Ambiente
                      </span>
                    )
                  ) : (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      color: '#94a3b8',
                    }}>
                      No seleccionada
                    </span>
                  )}
                </div>

                {/* Top-Right Action Buttons: Calibrate & Delete */}
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 5 }}>
                  <button
                    onClick={() => setEditingEnv(env)}
                    style={{
                      background: 'rgba(10, 12, 18, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sliders size={11} />
                    <span>Calibrar</span>
                  </button>

                  <button
                    onClick={() => deleteEnvironment(env.id)}
                    title="Eliminar este ambiente"
                    style={{
                      background: 'rgba(239, 68, 68, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Bottom Card Controls: Title, Reorder ⬅️ ➡️ & Checkbox */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden', paddingRight: '8px', flex: 1 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {env.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {env.isCustom ? '🤖 IA Custom' : env.category}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => moveEnvironment(index, 'left')}
                      disabled={isFirst}
                      title="Mover a la izquierda (subir orden)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isFirst ? 'rgba(255,255,255,0.2)' : '#ffffff',
                        padding: '3px 5px',
                        cursor: isFirst ? 'default' : 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      onClick={() => moveEnvironment(index, 'right')}
                      disabled={isLast}
                      title="Mover a la derecha (bajar orden)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isLast ? 'rgba(255,255,255,0.2)' : '#ffffff',
                        padding: '3px 5px',
                        cursor: isLast ? 'default' : 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  {/* Make Cover Button */}
                  {!isFirst && (
                    <button
                      onClick={() => setEnvironmentAsCover(env.id)}
                      title="Definir como Foto 1 (Portada Principal de MercadoLibre)"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#fbbf24',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <Star size={11} />
                      <span>Portada</span>
                    </button>
                  )}

                  {/* Selection Checkbox */}
                  <button
                    onClick={() => togglePosition(env.id, env.positions[0]?.id || '')}
                    title={isSelected ? 'Desmarcar de la exportación' : 'Marcar para exportar'}
                    style={{
                      width: '26px',
                      height: '26px',
                      minWidth: '26px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canva Smart Mold Editor Modal */}
      {editingEnv && (
        <CanvaMoldEditorModal
          environment={editingEnv}
          onClose={() => setEditingEnv(null)}
        />
      )}
    </div>
  );
};
