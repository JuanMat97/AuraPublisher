import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  DimensionPricingItem,
  FinishPricingItem,
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
} from '../../types/pricing';
import {
  DollarSign,
  Save,
  CheckCircle2,
  RefreshCw,
  Ruler,
  Sparkles,
  Sliders,
  Clock,
  Package,
  ShieldCheck,
  Tag,
  Calculator,
  Grid3X3,
  HelpCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';

export const PricingSettingsView: React.FC = () => {
  const {
    pricingConfig,
    setPricingConfig,
    updateDimensionPricing,
    updateFinishPricing,
    updatePricingParam,
    resetPricingConfig,
    syncToStore,
  } = useAppStore();

  const dimensionsList = useMemo(() => pricingConfig?.dimensions || DEFAULT_PRICING_CONFIG.dimensions, [pricingConfig?.dimensions]);
  const finishesList = useMemo(() => pricingConfig?.finishes || DEFAULT_PRICING_CONFIG.finishes, [pricingConfig?.finishes]);

  // Local state for toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedRatioFilter, setSelectedRatioFilter] = useState<'all' | 'square' | 'vertical' | 'horizontal'>('all');
  const [calculatorSearch, setCalculatorSearch] = useState('');

  // Handle Save
  const handleSave = () => {
    syncToStore();
    setToastMessage('¡Configuración de precios y variantes guardada correctamente!');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3500);
  };

  // Handle Reset to Defaults
  const handleReset = () => {
    if (window.confirm('¿Estás seguro de restablecer los precios y parámetros a los valores por defecto?')) {
      resetPricingConfig();
      setToastMessage('Precios y parámetros restablecidos a valores por defecto');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Filtered dimensions for Section 1
  const filteredDimensions = useMemo(() => {
    if (selectedRatioFilter === 'all') return dimensionsList;
    return dimensionsList.filter((d) => d.aspectRatio === selectedRatioFilter);
  }, [dimensionsList, selectedRatioFilter]);

  // Active items count
  const activeDimensions = useMemo(() => dimensionsList.filter((d) => d.active), [dimensionsList]);
  const activeFinishes = useMemo(() => finishesList.filter((f) => f.active), [finishesList]);

  // Variant Combinations Matrix
  const variantMatrix = useMemo(() => {
    const list: Array<{
      dimId: string;
      dimName: string;
      widthCm: number;
      heightCm: number;
      aspectRatio: 'square' | 'vertical' | 'horizontal';
      finishId: string;
      finishName: string;
      basePrice: number;
      surcharge: number;
      finalPrice: number;
      sku: string;
      active: boolean;
    }> = [];

    dimensionsList.forEach((dim) => {
      finishesList.forEach((fin) => {
        const active = dim.active && fin.active;
        const finalPrice = dim.basePrice + fin.surcharge;
        const sku = `AURA-${dim.widthCm}X${dim.heightCm}-${fin.id.toUpperCase().slice(0, 4)}`;

        list.push({
          dimId: dim.id,
          dimName: dim.name,
          widthCm: dim.widthCm,
          heightCm: dim.heightCm,
          aspectRatio: dim.aspectRatio,
          finishId: fin.id,
          finishName: fin.name,
          basePrice: dim.basePrice,
          surcharge: fin.surcharge,
          finalPrice,
          sku,
          active,
        });
      });
    });

    return list;
  }, [dimensionsList, finishesList]);

  // Filtered Matrix for Calculator
  const filteredMatrix = useMemo(() => {
    return variantMatrix.filter((item) => {
      if (!calculatorSearch) return true;
      const term = calculatorSearch.toLowerCase();
      return (
        item.dimName.toLowerCase().includes(term) ||
        item.finishName.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term)
      );
    });
  }, [variantMatrix, calculatorSearch]);

  const minFinalPrice = useMemo(() => {
    const activePrices = variantMatrix.filter((v) => v.active).map((v) => v.finalPrice);
    return activePrices.length > 0 ? Math.min(...activePrices) : 0;
  }, [variantMatrix]);

  const maxFinalPrice = useMemo(() => {
    const activePrices = variantMatrix.filter((v) => v.active).map((v) => v.finalPrice);
    return activePrices.length > 0 ? Math.max(...activePrices) : 0;
  }, [variantMatrix]);

  const totalActiveVariants = useMemo(() => {
    return activeDimensions.length * activeFinishes.length;
  }, [activeDimensions.length, activeFinishes.length]);

  return (
    <div
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        background: '#f8fafc',
        color: '#0f172a',
        padding: '28px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            background: '#0f172a',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#de2367',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '6px',
              background: '#fdf2f8',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #fbcfe8',
            }}
          >
            <DollarSign size={13} />
            <span>ESTRUCTURA DE PRECIOS & VARIANTES MERCADOLIBRE</span>
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Configuración de Precios & Variantes
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Definí precios base por tamaño, recargos por acabado y parámetros de logística para MercadoLibre.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <RefreshCw size={14} />
            <span>Restablecer Valores</span>
          </button>

          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #de2367, #be185d)',
              border: '1px solid #be185d',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(222, 35, 103, 0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(222, 35, 103, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(222, 35, 103, 0.35)';
            }}
          >
            <Save size={15} />
            <span>Guardar Configuración de Precios</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Metric 1: Active Dimensions */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ruler size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Medidas Activas
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {activeDimensions.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>/ {dimensionsList.length}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Finishes */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fdf2f8',
              color: '#de2367',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Acabados Activos
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {activeFinishes.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>/ {finishesList.length}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Combinations */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Grid3X3 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Variantes Generadas
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {totalActiveVariants}{' '}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>SKUs Publicables</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Price Range */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Rango de Precios Finales
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              ${minFinalPrice.toLocaleString('es-AR')}{' '}
              <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '12px' }}>a</span>{' '}
              ${maxFinalPrice.toLocaleString('es-AR')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Section 1 & Section 2 & Section 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* =========================================================================
            SECTION 1: TABLA DE MEDIDAS Y PRECIOS BASE
            ========================================================================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#334155',
                }}
              >
                <Ruler size={17} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  1. Tabla de Medidas y Precios Base
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Ajustá los valores base de cada cuadro según sus dimensiones físicas.
                </span>
              </div>
            </div>

            {/* Filter by Aspect Ratio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {(['all', 'square', 'vertical', 'horizontal'] as const).map((ratio) => {
                const isSelected = selectedRatioFilter === ratio;
                const labels: Record<string, string> = {
                  all: 'Todas',
                  square: '1:1',
                  vertical: 'Vertical',
                  horizontal: 'Horizontal',
                };
                return (
                  <button
                    key={ratio}
                    onClick={() => setSelectedRatioFilter(ratio)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSelected ? '#ffffff' : 'transparent',
                      color: isSelected ? '#de2367' : '#64748b',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {labels[ratio]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimension Rows List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1.4fr 100px 140px',
                padding: '10px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Activo</span>
              <span>Medida / Formato</span>
              <span>Proporción</span>
              <span style={{ textAlign: 'right' }}>Precio Base ($)</span>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {filteredDimensions.map((dim: DimensionPricingItem) => {
                const ratioBadges: Record<string, { label: string; bg: string; text: string }> = {
                  square: { label: 'Cuadrado 1:1', bg: '#fef3c7', text: '#92400e' },
                  vertical: { label: 'Vertical', bg: '#e0e7ff', text: '#3730a3' },
                  horizontal: { label: 'Horizontal', bg: '#dcfce7', text: '#166534' },
                };
                const badge = ratioBadges[dim.aspectRatio];

                return (
                  <div
                    key={dim.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1.4fr 100px 140px',
                      padding: '14px 24px',
                      alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      background: dim.active ? '#ffffff' : '#f8fafc',
                      opacity: dim.active ? 1 : 0.6,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Toggle switch */}
                    <div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dim.active}
                          onChange={(e) => updateDimensionPricing(dim.id, { active: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: dim.active ? '#de2367' : '#cbd5e1',
                            borderRadius: '20px',
                            transition: '0.2s',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              content: '""',
                              height: '14px',
                              width: '14px',
                              left: dim.active ? '19px' : '3px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              transition: '0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </span>
                      </label>
                    </div>

                    {/* Dimension details */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {dim.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        Dimensiones: {dim.widthCm} × {dim.heightCm} cm
                      </div>
                    </div>

                    {/* Aspect Ratio Badge */}
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Editable Price Input */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={dim.basePrice}
                        onChange={(e) =>
                          updateDimensionPricing(dim.id, { basePrice: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        style={{
                          width: '100px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: '13px',
                          fontWeight: 700,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#de2367')}
                        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Stack: Section 2 & Section 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* =========================================================================
              SECTION 2: RECARGOS POR ACABADO
              ========================================================================= */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#fdf2f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#de2367',
                }}
              >
                <Sparkles size={17} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  2. Recargos por Acabado
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Incremento sobre el precio base según la terminación elegida.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {finishesList.map((finish: FinishPricingItem) => {
                return (
                  <div
                    key={finish.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: finish.active ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                      background: finish.active ? '#ffffff' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      opacity: finish.active ? 1 : 0.6,
                      boxShadow: finish.active ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Toggle */}
                      <label style={{ position: 'relative', display: 'inline-block', width: '34px', height: '18px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={finish.active}
                          onChange={(e) => updateFinishPricing(finish.id, { active: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: finish.active ? '#de2367' : '#cbd5e1',
                            borderRadius: '20px',
                            transition: '0.2s',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              content: '""',
                              height: '12px',
                              width: '12px',
                              left: finish.active ? '19px' : '3px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              transition: '0.2s',
                            }}
                          />
                        </span>
                      </label>

                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {finish.name}
                        </div>
                        <div style={{ fontSize: '11px', color: finish.surcharge > 0 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                          {finish.surcharge > 0 ? `+$${finish.surcharge.toLocaleString('es-AR')}` : 'Sin recargo (Base)'}
                        </div>
                      </div>
                    </div>

                    {/* Surcharge input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>+$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={finish.surcharge}
                        onChange={(e) =>
                          updateFinishPricing(finish.id, { surcharge: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        style={{
                          width: '85px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#de2367')}
                        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              SECTION 3: PARÁMETROS DE MERCADOLIBRE
              ========================================================================= */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <Sliders size={17} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  3. Parámetros de MercadoLibre
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Valores operativos aplicados a las publicaciones y planillas exportadas.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Días de fabricación */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Clock size={14} color="#64748b" />
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Días de Fabricación
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={pricingConfig.manufacturingDays}
                    onChange={(e) =>
                      updatePricingParam('manufacturingDays', Math.max(0, parseInt(e.target.value) || 0))
                    }
                    style={{
                      width: '70px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>días hábiles</span>
                </div>
              </div>

              {/* Stock por Variante */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Package size={14} color="#64748b" />
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Stock por Variante
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min={1}
                    value={pricingConfig.defaultStock}
                    onChange={(e) =>
                      updatePricingParam('defaultStock', Math.max(1, parseInt(e.target.value) || 1))
                    }
                    style={{
                      width: '70px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>unidades / SKU</span>
                </div>
              </div>

              {/* Formato de Venta */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Tag size={14} color="#64748b" />
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Formato de Venta
                  </label>
                </div>
                <input
                  type="text"
                  value={pricingConfig.salesFormat}
                  onChange={(e) => updatePricingParam('salesFormat', e.target.value)}
                  placeholder="Unidad, Pack, etc."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '12px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Garantía */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <ShieldCheck size={14} color="#64748b" />
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Garantía de Fábrica
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min={0}
                    value={pricingConfig.warrantyDays || 30}
                    onChange={(e) =>
                      updatePricingParam('warrantyDays', Math.max(0, parseInt(e.target.value) || 0))
                    }
                    style={{
                      width: '70px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: INTERACTIVE VARIANT PRICE CALCULATOR & COMBINATION MATRIX
          ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with Search and Summary */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <Calculator size={17} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Calculadora Interactiva de Matriz de Variantes
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Vista en tiempo real del precio final calculado (Precio Base + Recargo) para cada combinación posible.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              value={calculatorSearch}
              onChange={(e) => setCalculatorSearch(e.target.value)}
              placeholder="Buscar por medida, acabado o SKU..."
              style={{
                width: '260px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 24px' }}>Estado</th>
                <th style={{ padding: '12px 16px' }}>SKU Referencia</th>
                <th style={{ padding: '12px 16px' }}>Medida</th>
                <th style={{ padding: '12px 16px' }}>Acabado</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Precio Base</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Recargo</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Precio Final de Venta</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((item, idx) => {
                const isMin = item.active && item.finalPrice === minFinalPrice;
                const isMax = item.active && item.finalPrice === maxFinalPrice;

                return (
                  <tr
                    key={`${item.dimId}-${item.finishId}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: !item.active ? '#fafafa' : idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                      opacity: item.active ? 1 : 0.45,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Status */}
                    <td style={{ padding: '12px 24px' }}>
                      {item.active ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                          Activo
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                          }}
                        >
                          Inactivo
                        </span>
                      )}
                    </td>

                    {/* SKU */}
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748b' }}>
                      {item.sku}
                    </td>

                    {/* Dimension */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {item.dimName}
                    </td>

                    {/* Finish */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: item.surcharge > 0 ? '#fdf2f8' : '#f1f5f9',
                          color: item.surcharge > 0 ? '#de2367' : '#475569',
                        }}
                      >
                        {item.finishName}
                      </span>
                    </td>

                    {/* Base Price */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      ${item.basePrice.toLocaleString('es-AR')}
                    </td>

                    {/* Surcharge */}
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        color: item.surcharge > 0 ? '#16a34a' : '#94a3b8',
                        fontWeight: item.surcharge > 0 ? 700 : 400,
                      }}
                    >
                      {item.surcharge > 0 ? `+$${item.surcharge.toLocaleString('es-AR')}` : '$0'}
                    </td>

                    {/* Final Price */}
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {isMin && (
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb' }}>
                            MÍNIMO
                          </span>
                        )}
                        {isMax && (
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#fdf2f8', color: '#de2367' }}>
                            MÁXIMO
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '14px',
                            fontWeight: 800,
                            color: item.active ? '#0f172a' : '#94a3b8',
                          }}
                        >
                          ${item.finalPrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
