import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { generateMeasuresInfographic, generateResinBenefitsInfographic } from '../../engine/infographicsEngine';
import { renderFramedCanvas } from '../../engine/frameRenderer';
import { loadImageElement, getSampleArtwork } from '../../utils/imageLoader';
import { BarChart2, Download } from 'lucide-react';

export const InfographicsView: React.FC = () => {
  const { selectedImage, productConfig } = useAppStore();
  const measuresCanvasRef = useRef<HTMLCanvasElement>(null);
  const resinCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;

    const render = async () => {
      const artSource = selectedImage ? selectedImage.path : getSampleArtwork('abstract').path;
      const artImg = await loadImageElement(artSource);

      const framed = renderFramedCanvas({
        artworkImage: artImg,
        frameType: 'wrap_1cm',
        finishType: productConfig.finishId,
        panelConfig: 'single',
      });

      if (!alive) return;

      const measures = generateMeasuresInfographic(framed, productConfig);
      const resin = generateResinBenefitsInfographic(framed, productConfig);

      if (measuresCanvasRef.current) {
        measuresCanvasRef.current.width = measures.width;
        measuresCanvasRef.current.height = measures.height;
        const ctx = measuresCanvasRef.current.getContext('2d')!;
        ctx.drawImage(measures, 0, 0);
      }

      if (resinCanvasRef.current) {
        resinCanvasRef.current.width = resin.width;
        resinCanvasRef.current.height = resin.height;
        const ctx = resinCanvasRef.current.getContext('2d')!;
        ctx.drawImage(resin, 0, 0);
      }
    };

    render();
    return () => { alive = false; };
  }, [selectedImage, productConfig]);

  const handleDownload = (canvasRef: React.RefObject<HTMLCanvasElement | null>, filename: string) => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', height: 'calc(100vh - 60px)', background: 'transparent' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
          <BarChart2 size={14} />
          <span>FOTOS DE CONVERSIÓN PARA MERCADOLIBRE</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f0f0f0' }}>
          Infografías Técnicas & Beneficios
        </h1>
        <p style={{ color: '#a0a0b0', fontSize: '13px' }}>
          Fotos explicativas que reducen preguntas en la publicación y aumentan la tasa de compra.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Measures Card */}
        <div className="surface-workspace" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0' }}>
              1. Guía de Medidas & Proporciones
            </h3>
            <span className="pill-badge pill-mint" style={{ fontSize: '10px' }}>1920×1920 HD</span>
          </div>

          <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <canvas ref={measuresCanvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => handleDownload(measuresCanvasRef, `infografia-medidas-${productConfig.sizeId}.jpg`)}
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <Download size={14} />
            <span>Descargar Infografía de Medidas</span>
          </button>
        </div>

        {/* Resin Benefits Card */}
        <div className="surface-workspace" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0' }}>
              2. Beneficios de la Resina Epoxi
            </h3>
            <span className="pill-badge pill-cyan" style={{ fontSize: '10px' }}>1920×1920 HD</span>
          </div>

          <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <canvas ref={resinCanvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => handleDownload(resinCanvasRef, `infografia-beneficios-resina.jpg`)}
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <Download size={14} />
            <span>Descargar Infografía de Resina</span>
          </button>
        </div>
      </div>
    </div>
  );
};
