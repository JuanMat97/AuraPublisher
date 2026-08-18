import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { CATALOG_SIZES, CATALOG_VINYLS } from '../../types/catalog';
import { analyzeArtworkAndGenerateSeo } from '../../services/seoEngine';
import { analyzeArtworkWithGemini } from '../../services/geminiAiService';
import {
  Copy,
  Check,
  FileText,
  Sparkles,
  Tag,
  Gamepad2,
  Film,
  Music,
  Trophy,
  Star,
  Key,
  Bot,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SeoCopyView: React.FC = () => {
  const { selectedImage, productConfig, setProductConfig, geminiApiKey, setGeminiApiKey } = useAppStore();

  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [showKeyText, setShowKeyText] = useState(false);

  // AI-Detected Content Cache
  const [aiAnalysis, setAiAnalysis] = useState<{
    cleanTopic?: string;
    category?: string;
    loreHook?: string;
    keywords?: string[];
  } | null>(null);

  const size = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const vinyl = CATALOG_VINYLS.find((v) => v.id === productConfig.vinylFinish) || CATALOG_VINYLS[1];

  const handleRunGeminiAnalysis = async () => {
    const keyToUse = apiKeyInput || geminiApiKey;
    if (!keyToUse) {
      setShowKeyInput(true);
      return;
    }

    if (!selectedImage) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      const result = await analyzeArtworkWithGemini(selectedImage.path, selectedImage.filename, keyToUse);
      setAiAnalysis(result);
      setGeminiApiKey(keyToUse);
      setShowKeyInput(false);
    } catch (e: any) {
      console.error('Gemini analysis error:', e);
      setAiError(e.message || 'Error al conectar con Google AI Studio');
    } finally {
      setIsAiLoading(false);
    }
  };

  const analysis = useMemo(() => {
    const filename = selectedImage ? selectedImage.filename : 'Obra_Decorativa.jpg';
    return analyzeArtworkAndGenerateSeo({
      filename,
      aiTopic: aiAnalysis?.cleanTopic,
      aiCategory: aiAnalysis?.category,
      aiLoreHook: aiAnalysis?.loreHook,
      aiKeywords: aiAnalysis?.keywords,
      customTitle: productConfig.title,
      sizeName: size.name,
      widthCm: size.widthCm,
      heightCm: size.heightCm,
      finishName: vinyl.name,
      hasResina: productConfig.hasResina,
      panelsCount: size.panelsCount || 1,
    });
  }, [selectedImage, aiAnalysis, productConfig.title, productConfig.vinylFinish, productConfig.hasResina, size, vinyl]);

  // Set default title on load if empty
  useEffect(() => {
    if (!productConfig.title && analysis.titles[0]) {
      setProductConfig({ title: analysis.titles[0].title });
    }
  }, [analysis.titles, productConfig.title, setProductConfig]);

  const titleLength = (productConfig.title || '').length;

  const handleSelectTitle = (titleText: string, index: number) => {
    setProductConfig({ title: titleText });
    navigator.clipboard.writeText(titleText);
    setCopiedTitleIndex(index);
    setTimeout(() => setCopiedTitleIndex(null), 2000);
  };

  const handleCopyDesc = () => {
    navigator.clipboard.writeText(analysis.fullDescription);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleAddKeyword = (kw: string) => {
    const current = productConfig.title || '';
    if (current.length + kw.length + 1 <= 60) {
      setProductConfig({ title: current ? `${current} ${kw}` : kw });
    }
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    gamer: <Gamepad2 size={18} color="#38bdf8" />,
    cine_series: <Film size={18} color="#f43f5e" />,
    musica: <Music size={18} color="#a855f7" />,
    deportes: <Trophy size={18} color="#eab308" />,
    anime: <Star size={18} color="#f97316" />,
    arte_general: <Sparkles size={18} color="var(--accent-primary)" />,
  };

  return (
    <div style={{
      flex: 1,
      padding: '24px 32px',
      overflowY: 'auto',
      height: 'calc(100vh - 56px)',
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
            <FileText size={14} />
            <span>SUITE DE POSICIONAMIENTO & SEO MERCADOLIBRE</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Generador Inteligente de Títulos & Ficha Técnica
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Títulos optimizados para el algoritmo de búsqueda de MercadoLibre (fórmula estricta &lt; 60 caracteres) y copy persuasivo.
          </p>
        </div>

        {/* Gemini API Key & Trigger Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: geminiApiKey ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: geminiApiKey ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              color: geminiApiKey ? '#34d399' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Key size={13} />
            <span>{geminiApiKey ? 'Google AI Studio Conectado' : 'Configurar Gemini API Key'}</span>
          </button>

          <button
            className="btn btn-primary"
            disabled={!selectedImage || isAiLoading}
            onClick={handleRunGeminiAnalysis}
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px' }}
          >
            {isAiLoading ? (
              <>
                <RefreshCw size={14} className="spin-slow" />
                <span>Analizando Obra con IA...</span>
              </>
            ) : (
              <>
                <Bot size={14} />
                <span>Analizar con Gemini Vision</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Google AI Studio API Key Modal / Dropdown */}
      {showKeyInput && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: '#0d1017',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
              🔑 Google AI Studio — Gemini API Key
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>aistudio.google.com</a>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showKeyText ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Pegá tu Gemini API Key aquí (AIzaSy...)"
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                {showKeyText ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <button
              onClick={() => {
                setGeminiApiKey(apiKeyInput);
                setShowKeyInput(false);
                if (selectedImage) handleRunGeminiAnalysis();
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'var(--accent-primary)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Guardar y Analizar
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {aiError && (
        <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px' }}>
          ⚠️ {aiError}
        </div>
      )}

      {/* Topic Detection & Lore Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'rgba(222, 35, 103, 0.08)',
        border: '1px solid rgba(222, 35, 103, 0.25)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {categoryIcons[analysis.category] || <Sparkles size={20} color="var(--accent-primary)" />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {aiAnalysis ? '🤖 RECONOCIMIENTO GOOGLE AI STUDIO:' : 'TEMÁTICA DETECTADA:'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              {analysis.detectedTopic}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', margin: 0 }}>
            {analysis.emotionalPitch}
          </p>
        </div>
      </div>

      {/* 2-Column SEO Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left Column: 3 Recommended Titles + Custom Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 3 Recommended Titles */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                🥇 3 Títulos Recomendados (<span style={{ color: 'var(--accent-primary)' }}>&le; 60 caracteres</span>)
              </h3>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                Algoritmo ML OK
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.titles.map((t, idx) => {
                const isCopied = copiedTitleIndex === idx;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTitle(t.title, idx)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '2px' }}>
                        {t.formula}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        {t.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                      }}>
                        {t.length}/60
                      </span>
                      <button
                        className={`btn ${isCopied ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '8px' }}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copiado' : 'Usar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Title Input */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Título Activo de la Publicación
              </h3>
              <span style={{
                background: titleLength > 60 ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)',
                color: titleLength > 60 ? '#f87171' : '#34d399',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
              }}>
                {titleLength} / 60 Caracteres
              </span>
            </div>

            <input
              type="text"
              value={productConfig.title}
              onChange={(e) => setProductConfig({ title: e.target.value })}
              placeholder="Haz clic en uno de los títulos recomendados o escribe aquí..."
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: titleLength > 60 ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
              }}
            />

            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Palabras Clave de Búsqueda (+1 Clic para sumar al título)
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {analysis.suggestedKeywords.map((kw) => (
                  <button
                    key={kw}
                    className="btn btn-secondary"
                    onClick={() => handleAddKeyword(kw)}
                    style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px' }}
                  >
                    <Tag size={11} color="var(--accent-primary)" />
                    <span>+{kw}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Structured Description */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Descripción Completa para MercadoLibre
            </h3>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(222, 35, 103, 0.15)', color: 'var(--accent-primary)' }}>
              Copy de Alta Conversión
            </span>
          </div>

          <textarea
            value={analysis.fullDescription}
            readOnly
            rows={18}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '11px',
              lineHeight: '1.6',
              fontFamily: 'var(--font-mono)',
              resize: 'none',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
            }}
          />

          <button
            className="btn btn-primary"
            onClick={handleCopyDesc}
            style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '12px' }}
          >
            {copiedDesc ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedDesc ? '¡Descripción Copiada al Portapapeles!' : 'Copiar Descripción Completa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
