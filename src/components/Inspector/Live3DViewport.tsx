import React from 'react';
import { useAppStore } from '../../store/appStore';
import { CATALOG_SIZES, CATALOG_VINYLS, VinylFinish } from '../../types/catalog';
import { AuraStudioCanvas3D } from '../configurador3d/AuraStudioCanvas3D';
import { Rotate3d, RotateCcw, Flame, Sparkles } from 'lucide-react';

export const Live3DViewport: React.FC = () => {
  const {
    selectedImage,
    productConfig,
    setProductConfig,
    orbitRotation,
    setOrbitRotation,
  } = useAppStore();

  const currentSize = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const panelsCount = currentSize.panelsCount || 1;

  const angleDegrees = Math.round(orbitRotation.y * (180 / Math.PI));

  const handleAngleChange = (deg: number) => {
    setOrbitRotation({ ...orbitRotation, y: deg * (Math.PI / 180) });
    setProductConfig({ wallAngle: deg });
  };

  const handleResetAll = () => {
    setOrbitRotation({ x: 0.08, y: 0 });
    setProductConfig({ wallAngle: 0, pitchDeg: 0 });
  };

  const handleFinishChange = (finish: VinylFinish) => {
    setProductConfig({ vinylFinish: finish });
  };

  const handleToggleResina = () => {
    setProductConfig({ hasResina: !productConfig.hasResina });
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        padding: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-card)',
        backdropFilter: 'blur(20px) saturate(180%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(222, 35, 103, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Rotate3d size={14} color="var(--accent-primary)" />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              Visor 3D Interactivo
            </span>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetAll}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 9px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.10)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <RotateCcw size={11} /> Reset (0º)
        </button>
      </div>

      {/* 2. 3D WebGL Canvas Viewport */}
      <div
        style={{
          height: '180px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#07090e',
          position: 'relative',
        }}
      >
        <AuraStudioCanvas3D
          textureUrl={selectedImage ? selectedImage.path : null}
          finish={productConfig.vinylFinish}
          resina={productConfig.hasResina}
          panelsCount={panelsCount}
          size={{ w: currentSize.widthCm, h: currentSize.heightCm }}
          gap={productConfig.setSpacingCm || 3}
          mood={productConfig.lightMode || 'day'}
          reflectionType={productConfig.reflectionType || 'panoramic_window'}
          rotationY={orbitRotation.y}
        />

        {/* 3D Interaction Hint Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '8px',
            background: 'rgba(7, 9, 14, 0.75)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '2px 7px',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#94a3b8',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={9} color="var(--accent-primary)" />
          <span>Órbita 3D activa • Arrastrar para rotar</span>
        </div>
      </div>

      {/* 3. Wall Angle Slider (-60º to +60º) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
          <span style={{ fontWeight: 500 }}>Ángulo de Pared</span>
          <span
            style={{
              fontWeight: 700,
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(222, 35, 103, 0.12)',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {angleDegrees > 0 ? `+${angleDegrees}º` : `${angleDegrees}º`}
          </span>
        </div>
        <input
          type="range"
          min="-60"
          max="60"
          value={Math.max(-60, Math.min(60, angleDegrees))}
          onChange={(e) => handleAngleChange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            accentColor: 'var(--accent-primary)',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* 4. Preset Buttons: Frontal (0º), 3/4 (35º), Canto 1cm (85º) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        <button
          onClick={() => handleAngleChange(0)}
          style={{
            padding: '6px 4px',
            fontSize: '10px',
            fontWeight: 600,
            borderRadius: '8px',
            background: angleDegrees === 0 ? 'rgba(222, 35, 103, 0.20)' : 'rgba(255, 255, 255, 0.04)',
            color: angleDegrees === 0 ? '#ffffff' : '#cbd5e1',
            border: angleDegrees === 0 ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
          }}
        >
          Frontal (0º)
        </button>

        <button
          onClick={() => handleAngleChange(35)}
          style={{
            padding: '6px 4px',
            fontSize: '10px',
            fontWeight: 600,
            borderRadius: '8px',
            background: angleDegrees === 35 ? 'rgba(222, 35, 103, 0.20)' : 'rgba(255, 255, 255, 0.04)',
            color: angleDegrees === 35 ? '#ffffff' : '#cbd5e1',
            border: angleDegrees === 35 ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
          }}
        >
          3/4 (35º)
        </button>

        <button
          onClick={() => handleAngleChange(85)}
          style={{
            padding: '6px 4px',
            fontSize: '10px',
            fontWeight: 600,
            borderRadius: '8px',
            background: angleDegrees === 85 ? 'rgba(222, 35, 103, 0.20)' : 'rgba(255, 255, 255, 0.04)',
            color: angleDegrees === 85 ? '#ffffff' : '#cbd5e1',
            border: angleDegrees === 85 ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
          }}
        >
          Canto 1cm (85º)
        </button>
      </div>

      {/* 5. Finish Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>
          Acabado del Vinilo
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {CATALOG_VINYLS.map((vin) => {
            const isSelected = productConfig.vinylFinish === vin.id;
            return (
              <button
                key={vin.id}
                onClick={() => handleFinishChange(vin.id as VinylFinish)}
                style={{
                  padding: '6px 4px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(222, 35, 103, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '10px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.18s ease',
                }}
              >
                <span>{vin.id === 'mate' ? '🌑' : vin.id === 'brillante' ? '⚪' : '🔮'}</span>
                <span>{vin.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Resin Gloss Toggle Switch */}
      <div
        onClick={handleToggleResina}
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          background: productConfig.hasResina ? 'rgba(222, 35, 103, 0.12)' : 'rgba(255, 255, 255, 0.03)',
          border: productConfig.hasResina ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: productConfig.hasResina ? 'linear-gradient(135deg, #de2367, #be185d)' : 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Flame size={15} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
              Resina Epoxi (Gloss)
            </div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>
              Capa espejo 3D cristalina
            </div>
          </div>
        </div>

        {/* Switch pill */}
        <div
          style={{
            width: '34px',
            height: '18px',
            borderRadius: '9px',
            background: productConfig.hasResina ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.14)',
            position: 'relative',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#ffffff',
              position: 'absolute',
              top: '2px',
              left: productConfig.hasResina ? '18px' : '2px',
              transition: 'all 0.2s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};
