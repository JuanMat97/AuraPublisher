import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  PublicationType,
  ADAPTABLE_SIZES,
  PUBLICATION_FINISHES,
  AdaptableSize,
  FinishMetadata,
} from '../../types/publication';
import {
  buildPublicationVariants,
  exportPublicationToExcel,
  generateAutoPublicationTitle,
  generateDefaultPublicationDescription,
} from '../../utils/publicationHelpers';
import { enhanceDescriptionWithGemini } from '../../services/geminiAiService';
import {
  Sparkles,
  FileSpreadsheet,
  ArrowLeft,
  Check,
  Layers,
  Copy,
  Tag,
  DollarSign,
  Info,
  CheckCircle2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Maximize2,
  Grid,
} from 'lucide-react';

export const PublishView: React.FC = () => {
  const {
    selectedImage,
    publicationType,
    setPublicationType,
    publicationTheme,
    setPublicationTheme,
    designName,
    setDesignName,
    publicationTitle,
    setPublicationTitle,
    publicationDescription,
    setPublicationDescription,
    selectedSizes,
    toggleSelectedSize,
    setSelectedSizes,
    selectedFinishes,
    toggleSelectedFinish,
    sizePrices,
    setSizePrice,
    detectedAspectRatio,
    geminiApiKey,
    setGeminiApiKey,
    setCurrentView,
    setCurrentStep,
    outputFolder,
  } = useAppStore();

  const [filterByAspectRatio, setFilterByAspectRatio] = useState(true);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [showKeyText, setShowKeyText] = useState(false);

  // Filter sizes based on user choice & detected aspect ratio
  const displayedSizes = useMemo(() => {
    if (!filterByAspectRatio) return ADAPTABLE_SIZES;
    return ADAPTABLE_SIZES.filter((s: AdaptableSize) => s.aspectRatio === detectedAspectRatio);
  }, [filterByAspectRatio, detectedAspectRatio]);

  // Build current variant matrix
  const variants = useMemo(() => {
    return buildPublicationVariants({
      selectedSizes,
      selectedFinishes,
      sizePrices,
      theme: publicationTheme,
      designName,
      publicationType,
    });
  }, [selectedSizes, selectedFinishes, sizePrices, publicationTheme, designName, publicationType]);

  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.finalPrice ?? 0)) : 0;
  const maxPrice = variants.length > 0 ? Math.max(...variants.map((v) => v.finalPrice ?? 0)) : 0;

  const titleLength = (publicationTitle || '').length;
  const isTitleOverLimit = titleLength > 60;

  const handleTypeChange = (type: PublicationType) => {
    setPublicationType(type);
  };

  const handleAutoGenerateTitle = () => {
    const title = generateAutoPublicationTitle(publicationType, publicationTheme);
    setPublicationTitle(title);
  };

  const handleResetDescription = () => {
    const desc = generateDefaultPublicationDescription({
      theme: publicationTheme,
      designName,
      type: publicationType,
    });
    setPublicationDescription(desc);
  };

  const handleEnhanceWithGemini = async () => {
    const key = apiKeyInput || geminiApiKey;
    if (!key) {
      setShowKeyModal(true);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const enhanced = await enhanceDescriptionWithGemini({
        theme: publicationTheme,
        designName,
        type: publicationType,
        currentDescription: publicationDescription || generateDefaultPublicationDescription({ theme: publicationTheme, designName, type: publicationType }),
        apiKey: key,
      });

      setPublicationDescription(enhanced);
      setGeminiApiKey(key);
      setShowKeyModal(false);
    } catch (err: any) {
      console.error('Gemini error:', err);
      setAiError(err.message || 'Error al conectar con Google Gemini');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const res = exportPublicationToExcel({
        title: publicationTitle,
        theme: publicationTheme,
        designName,
        publicationType,
        description: publicationDescription,
        variants,
        outputFolder,
      });

      if (res.success) {
        setExportSuccess(`¡Archivo exportado con éxito: ${res.filename}!`);
        setTimeout(() => setExportSuccess(null), 5000);
      }
    } catch (e: any) {
      alert(`Error al exportar Excel: ${e.message}`);
    }
  };

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(publicationTitle);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleCopyDesc = () => {
    navigator.clipboard.writeText(publicationDescription);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleSelectAllSizes = () => {
    setSelectedSizes(displayedSizes.map((s) => s.id));
  };

  const handleDeselectAllSizes = () => {
    setSelectedSizes([]);
  };

  const publicationTypes: Array<{ id: PublicationType; label: string; icon: string; desc: string }> = [
    { id: 'individual', label: 'Individual', icon: '🖼️', desc: '1 Cuadro con bastidor' },
    { id: 'set', label: 'Set Políptico', icon: '📑', desc: 'Juegos de 2 o 3 cuadros' },
    { id: 'resina', label: 'Resina Epoxi', icon: '💎', desc: 'Vidrio líquido 3mm Ultra Gloss' },
    { id: 'personalizado', label: 'Personalizado', icon: '🎨', desc: 'Diseño o foto a pedido' },
  ];

  return (
    <div
      style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        height: 'calc(100vh - 56px)',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Top Breadcrumb / Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
            <FileSpreadsheet size={14} />
            <span>PASO 3 DE 4 — CONFIGURACIÓN DE PUBLICACIÓN & EXPORTACIÓN</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Publicación & Matriz de Variantes MercadoLibre
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Configurá títulos homologados, precios por medida y recargos por acabado para generar la planilla de MercadoLibre en 1 clic.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setCurrentStep(2);
              setCurrentView('studio');
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}
          >
            <ArrowLeft size={14} />
            <span>⬅️ Volver a Mockups</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="btn btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 4px 20px var(--accent-primary-glow)',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Exportar a Excel de MercadoLibre 🚀</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {exportSuccess && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Grid: Left Column (Form Fields) & Right Column (Sizes, Finishes, Variants Table) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) minmax(500px, 1.3fr)', gap: '24px' }}>
        
        {/* Left Column: Metadata, Title, Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Publication Type Selector */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tipo de Publicación
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Afecta el título y modelo
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {publicationTypes.map((t) => {
                const isSelected = publicationType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTypeChange(t.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(222, 35, 103, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Theme and Design Name */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Datos de la Obra
              </span>
              {selectedImage && (
                <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedImage.filename}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Temática / Franquicia
                </label>
                <input
                  type="text"
                  value={publicationTheme}
                  onChange={(e) => setPublicationTheme(e.target.value)}
                  placeholder="Ej: Pokemon, GTA 6, Dragon Ball"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Nombre del Diseño
                </label>
                <input
                  type="text"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="Ej: Pikachu Sunset, Michael & Trevor"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Quick Resync */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAutoGenerateTitle}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '7px 12px', fontSize: '11px', borderRadius: '8px' }}
              >
                <Sparkles size={13} color="var(--accent-primary)" />
                <span>Actualizar Título</span>
              </button>

              <button
                onClick={handleResetDescription}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '7px 12px', fontSize: '11px', borderRadius: '8px' }}
              >
                <RefreshCw size={13} />
                <span>Actualizar Copy</span>
              </button>
            </div>
          </div>

          {/* Card 3: Title Input with 60-Char Limit Counter */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: isTitleOverLimit ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Título MercadoLibre
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isTitleOverLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isTitleOverLimit ? '#f87171' : '#34d399',
                    border: isTitleOverLimit ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  }}
                >
                  {titleLength} / 60 caracteres
                </span>

                <button
                  onClick={handleCopyTitle}
                  title="Copiar título"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {copiedTitle ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={publicationTitle}
                onChange={(e) => setPublicationTitle(e.target.value)}
                placeholder="Título optimizado para MercadoLibre..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: isTitleOverLimit ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            {isTitleOverLimit && (
              <span style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚠️ El título excede los 60 caracteres máximos permitidos por la API de MercadoLibre.
              </span>
            )}
          </div>

          {/* Card 4: Description Textarea & AI Enhancement */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Descripción de la Publicación
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleEnhanceWithGemini}
                  disabled={isAiLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  }}
                >
                  <Sparkles size={12} />
                  <span>{isAiLoading ? 'Generando Copy...' : 'Mejorar con IA (Gemini)'}</span>
                </button>

                <button
                  onClick={handleCopyDesc}
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px' }}
                >
                  {copiedDesc ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  <span>{copiedDesc ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {aiError && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '11px' }}>
                {aiError}
              </div>
            )}

            <textarea
              rows={8}
              value={publicationDescription}
              onChange={(e) => setPublicationDescription(e.target.value)}
              placeholder="Descripción persuasiva para MercadoLibre..."
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '12px',
                lineHeight: 1.55,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

        </div>

        {/* Right Column: Sizes, Finishes, Variant Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Sizes & Base Prices */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Medidas Disponibles & Precios Base
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Proporción detectada:</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(222, 35, 103, 0.2)',
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase',
                  }}>
                    {detectedAspectRatio}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setFilterByAspectRatio(!filterByAspectRatio)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: filterByAspectRatio ? 'var(--accent-primary-subtle)' : 'rgba(255, 255, 255, 0.06)',
                    border: filterByAspectRatio ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: filterByAspectRatio ? '#ffffff' : '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {filterByAspectRatio ? '🔍 Filtrando por Proporción' : '🌐 Todas las Medidas'}
                </button>

                <button
                  onClick={handleSelectAllSizes}
                  style={{ padding: '4px 8px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '10px', cursor: 'pointer' }}
                >
                  Todas
                </button>

                <button
                  onClick={handleDeselectAllSizes}
                  style={{ padding: '4px 8px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '10px', cursor: 'pointer' }}
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* Sizes List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
              {displayedSizes.map((size: AdaptableSize) => {
                const isChecked = selectedSizes.includes(size.id);
                const currentPrice = sizePrices[size.id] ?? size.defaultPrice;

                return (
                  <div
                    key={size.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: isChecked ? '1px solid rgba(222, 35, 103, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      background: isChecked ? 'rgba(222, 35, 103, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      onClick={() => toggleSelectedSize(size.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by div click
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isChecked ? '#ffffff' : '#94a3b8', whiteSpace: 'nowrap' }}>
                          {size.label}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {size.description}
                        </div>
                      </div>
                    </div>

                    {/* Editable Price Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '90px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>$</span>
                      <input
                        type="number"
                        value={currentPrice}
                        onChange={(e) => setSizePrice(size.id, Math.max(0, parseInt(e.target.value) || 0))}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Finishes & Surcharges */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Acabados & Recargos por Terminación
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {selectedFinishes.length} de {PUBLICATION_FINISHES.length} activos
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {PUBLICATION_FINISHES.map((finish: FinishMetadata) => {
                const isChecked = selectedFinishes.includes(finish.id);

                return (
                  <div
                    key={finish.id}
                    onClick={() => toggleSelectedFinish(finish.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isChecked ? '1px solid rgba(222, 35, 103, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      background: isChecked ? 'rgba(222, 35, 103, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isChecked ? '#ffffff' : '#94a3b8' }}>
                          {finish.name}
                        </div>
                        <div style={{ fontSize: '10px', color: finish.surcharge > 0 ? '#34d399' : '#64748b', fontWeight: 600 }}>
                          {finish.surcharge > 0 ? `+$${finish.surcharge.toLocaleString('es-AR')}` : '+$0 (Base)'}
                        </div>
                      </div>
                    </div>

                    {finish.badge && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#cbd5e1',
                      }}>
                        {finish.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Generated Variants Matrix Table */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Table Header Info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  Matriz de Variantes Generadas ({variants.length})
                </span>
              </div>

              {variants.length > 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Rango Precios:</span>
                  <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    ${minPrice.toLocaleString('es-AR')} — ${maxPrice.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.4)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>SKU</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Medida</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Acabado</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Base</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Recargo</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right', color: '#ffffff' }}>Precio Final</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        Seleccioná al menos 1 medida y 1 acabado para generar variantes.
                      </td>
                    </tr>
                  ) : (
                    variants.map((v, i) => (
                      <tr
                        key={v.sku + i}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: i % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', fontSize: '10px' }}>
                          {v.sku}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#ffffff', fontWeight: 600 }}>
                          {v.sizeLabel}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                          {v.finishLabel}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                          ${(v.basePrice ?? 0).toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: (v.surcharge ?? 0) > 0 ? '#34d399' : '#64748b' }}>
                          {(v.surcharge ?? 0) > 0 ? `+$${(v.surcharge ?? 0).toLocaleString('es-AR')}` : '$0'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '12px' }}>
                          ${(v.finalPrice ?? 0).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Listo para exportar al formato oficial de publicación masiva de MercadoLibre.
              </span>

              <button
                onClick={handleExportExcel}
                className="btn btn-primary"
                style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '8px' }}
              >
                <FileSpreadsheet size={14} />
                <span>Exportar Excel ({variants.length} filas)</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Gemini API Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '460px',
              background: '#0d1117',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} color="#a855f7" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  Google AI Studio API Key
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Ingresá tu API Key de Gemini para optimizar títulos y descripciones con IA.
                </p>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showKeyText ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                {showKeyText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEnhanceWithGemini}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
              >
                Guardar y Generar Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
