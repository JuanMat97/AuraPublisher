import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CATALOG_SIZES, CATALOG_VINYLS, AMBIENT_LIGHTS, REFLECTION_OPTIONS } from '../../types/catalog';
import { Bookmark, Check, Trash2, PlusCircle } from 'lucide-react';

export const PresetsView: React.FC = () => {
  const { presets, loadPreset, deletePreset, addPreset, setCurrentView } = useAppStore();
  const [newPresetName, setNewPresetName] = useState('');

  const handleCreatePreset = () => {
    if (newPresetName.trim()) {
      addPreset(newPresetName.trim());
      setNewPresetName('');
    }
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', height: 'calc(100vh - 60px)', background: 'transparent' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
          <Bookmark size={14} />
          <span>CONFIGURACIONES DE PRODUCTO GUARDADAS</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f0f0f0' }}>
          Presets de Publicación
        </h1>
        <p style={{ color: '#a0a0b0', fontSize: '13px' }}>
          Guardá combinaciones frecuentes de tamaño, acabado, reflejo e iluminación ambiental.
        </p>
      </div>

      {/* Create Preset Form */}
      <div className="surface-workspace" style={{ padding: '18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)' }}>
        <input
          type="text"
          className="input-light"
          placeholder="Nombre del preset (ej: Individual 50x70 Resina Ventana)..."
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          style={{ maxWidth: '480px' }}
        />
        <button className="btn btn-primary" onClick={handleCreatePreset}>
          <PlusCircle size={15} />
          <span>Guardar Configuración Actual</span>
        </button>
      </div>

      {/* Presets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
        {presets.map((preset) => {
          const size = CATALOG_SIZES.find((s) => s.id === preset.config.sizeId);
          const vinyl = CATALOG_VINYLS.find((v) => v.id === preset.config.vinylFinish);
          const lightOpt = AMBIENT_LIGHTS.find((l) => l.id === preset.config.lightMode);
          const refOpt = REFLECTION_OPTIONS.find((r) => r.id === preset.config.reflectionType);

          return (
            <div key={preset.id} className="light-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0' }}>
                  {preset.name}
                </h3>
                <span className="pill-badge pill-amber" style={{ fontSize: '10px' }}>1cm Wrap</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#a0a0b0' }}>
                <div>📐 Medida: <strong style={{ color: '#f0f0f0' }}>{size?.name}</strong></div>
                <div>✨ Acabado: <strong style={{ color: 'var(--accent-gold)' }}>Vinilo {vinyl?.name || 'Brillante'} {preset.config.hasResina ? '+ Resina Epoxi' : ''}</strong></div>
                <div>🪟 Reflejo: <strong style={{ color: '#f0f0f0' }}>{refOpt?.name || 'Ventanal Estudio'}</strong></div>
                <div>💡 Iluminación: <strong style={{ color: '#f0f0f0' }}>{lightOpt?.name || 'Día Luminoso'}</strong></div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { loadPreset(preset); setCurrentView('studio'); }}
                  style={{ flex: 1, fontSize: '12px' }}
                >
                  <Check size={14} />
                  <span>Cargar en Studio</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => deletePreset(preset.id)}
                  style={{ padding: '8px' }}
                >
                  <Trash2 size={14} color="#f87171" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
