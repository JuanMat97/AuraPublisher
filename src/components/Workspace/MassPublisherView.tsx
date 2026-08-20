import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  LibraryTitle,
  PricingConfig,
  ADAPTABLE_SIZES,
  PUBLICATION_FINISHES,
} from '../../types/publication';
import { DEFAULT_PRICING_CONFIG } from '../../types/pricing';
import {
  generateMlSeoTitle,
  generatePersuasiveDescription,
} from '../../engine/copyGenerator';
import { exportMassivePublicationToMlExcel } from '../../engine/excelExporter';
import {
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Eye,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  X,
  Plus,
  RefreshCw,
  Film,
  Gamepad2,
  Tv,
  Music,
  Trophy,
  Palette,
  AlertCircle,
} from 'lucide-react';

const INITIAL_LIBRARY_TITLES: LibraryTitle[] = [
  {
    id: 'title_pulp_fiction',
    titulo: 'Pulp Fiction',
    titulo_original: 'Pulp Fiction',
    anio: '1994',
    generos: ['Crimen', 'Drama', 'Cine de Culto'],
    category: 'peliculas',
    finishType: 'resina',
    sinopsis:
      'La vida de dos sicarios de la mafia, un boxeador en fuga, la esposa de un gángster y un par de bandidos se entrelazan en cuatro historias de violencia y redención dirigidas por Quentin Tarantino.',
    posterUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_interstellar',
    titulo: 'Interstellar',
    titulo_original: 'Interstellar',
    anio: '2014',
    generos: ['Sci-Fi', 'Aventura', 'Drama'],
    category: 'peliculas',
    finishType: 'resina',
    sinopsis:
      'Un equipo de exploradores viaja a través de un agujero de gusano en el espacio en un intento desesperado por garantizar la supervivencia y el futuro de la humanidad.',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_dark_knight',
    titulo: 'The Dark Knight',
    titulo_original: 'The Dark Knight',
    anio: '2008',
    generos: ['Acción', 'Crimen', 'Superhéroes'],
    category: 'peliculas',
    finishType: 'resina',
    sinopsis:
      'Cuando el temible Joker desata el caos y la anarquía en las calles de Gotham City, Batman debe aceptar una de las mayores pruebas psicológicas y físicas para combatir la injusticia.',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_fight_club',
    titulo: 'Fight Club',
    titulo_original: 'Fight Club',
    anio: '1999',
    generos: ['Drama', 'Thriller Psicológico'],
    category: 'peliculas',
    finishType: 'resina',
    sinopsis:
      'Un oficinista insomne que busca una forma de cambiar su monótona vida se cruza con un carismático fabricante de jabón llamado Tyler Durden y juntos fundan un club de peleas clandestino.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_blade_runner',
    titulo: 'Blade Runner 2049',
    titulo_original: 'Blade Runner 2049',
    anio: '2017',
    generos: ['Sci-Fi', 'Neo-Noir', 'Cyberpunk'],
    category: 'peliculas',
    finishType: 'resina',
    sinopsis:
      'Treinta años después de los eventos de la primera película, un nuevo blade runner, el oficial K de LAPD, descubre un secreto enterrado que tiene el potencial de sumergir a la sociedad en el caos.',
    posterUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_gta6',
    titulo: 'Grand Theft Auto VI',
    titulo_original: 'GTA VI Vice City',
    anio: '2025',
    generos: ['Gaming', 'Acción', 'Mundo Abierto'],
    category: 'gamer',
    finishType: 'resina',
    sinopsis:
      'El videojuego más esperado de la historia. Toda la vibra neón de Vice City, persecuciones playeras y la atmósfera criminal definitiva de Rockstar Games inmortalizada en alta definición.',
    posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_cyberpunk',
    titulo: 'Cyberpunk 2077: Night City',
    titulo_original: 'Cyberpunk 2077',
    anio: '2020',
    generos: ['Gaming', 'Cyberpunk', 'RPG'],
    category: 'gamer',
    finishType: 'resina',
    sinopsis:
      'Las luces de neón, los rascacielos megalómanos y la gloria futurista de Night City. Una pieza con profundidad y brillo espejado para elevar tu setup gamer.',
    posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
  {
    id: 'title_dbz',
    titulo: 'Dragon Ball Z: Goku Ultra Instinto',
    titulo_original: 'Dragon Ball Super',
    anio: '2023',
    generos: ['Anime', 'Manga', 'Shonen'],
    category: 'anime',
    finishType: 'resina',
    sinopsis:
      'El ki plateado desbordante y la transformación definitiva del saiyajin más legendario. Un cuadro con energía explosiva y calidad de galería para fanáticos.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
    selected: true,
    availableSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
  },
];

export const MassPublisherView: React.FC = () => {
  const { outputFolder } = useAppStore();

  const [titles, setTitles] = useState<LibraryTitle[]>(() => {
    return INITIAL_LIBRARY_TITLES.map((t) => ({
      ...t,
      seoTitle: generateMlSeoTitle(t.titulo, t.category || 'peliculas', t.finishType || 'resina'),
    }));
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [previewTitle, setPreviewTitle] = useState<LibraryTitle | null>(null);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTitleId, setCopiedTitleId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    filePath?: string;
    filename?: string;
    totalRows?: number;
    error?: string;
  } | null>(null);

  // Pricing config
  const pricingConfig: PricingConfig = useMemo(
    () => ({
      ...DEFAULT_PRICING_CONFIG,
      basePrices: {
        ...DEFAULT_PRICING_CONFIG.basePrices,
        '25x25': 14900,
        '40x60': 25900,
        '50x50': 24900,
        '50x70': 29900,
        '60x40': 25900,
        '70x40': 28900,
        '80x45': 31900,
        '90x50': 34900,
        '80x80': 36900,
        '70x100': 42900,
      },
      finishSurcharges: {
        resina: 4500,
        vinilo_mate: 0,
        vinilo_brillante: 0,
        holografico: 2500,
      },
      defaultStock: 99,
      freeShippingThreshold: 30000,
      defaultSizes: ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50'],
      defaultFinishes: ['resina', 'vinilo_mate', 'vinilo_brillante', 'holografico'],
    }),
    []
  );

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setTitles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleSelectAll = () => {
    const allSelected = filteredTitles.every((t) => t.selected);
    setTitles((prev) =>
      prev.map((t) => {
        const isMatch = filteredTitles.some((ft) => ft.id === t.id);
        return isMatch ? { ...t, selected: !allSelected } : t;
      })
    );
  };

  const handleUpdateSeoTitle = (id: string, newTitle: string) => {
    setTitles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, seoTitle: newTitle } : t))
    );
  };

  const handleRegenerateSeoTitle = (id: string) => {
    setTitles((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const freshTitle = generateMlSeoTitle(
            t.titulo,
            t.category || 'peliculas',
            t.finishType || 'resina'
          );
          return { ...t, seoTitle: freshTitle };
        }
        return t;
      })
    );
  };

  // Filtered Titles
  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      const matchSearch =
        t.titulo.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (t.titulo_original &&
          t.titulo_original.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (t.seoTitle &&
          t.seoTitle.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchCategory =
        categoryFilter === 'all' || t.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [titles, searchFilter, categoryFilter]);

  // Summary statistics
  const selectedTitles = useMemo(() => titles.filter((t) => t.selected), [titles]);
  const variantsPerTitle = (pricingConfig.defaultSizes?.length || 8) * (pricingConfig.defaultFinishes?.length || 4);
  const totalVariantsCount = selectedTitles.length * variantsPerTitle;

  // Export handler
  const handleExportMassiveExcel = async () => {
    if (selectedTitles.length === 0) {
      alert('Por favor selecciona al menos un título para exportar.');
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      const result = await exportMassivePublicationToMlExcel({
        titles: selectedTitles,
        pricingConfig,
        outputDir: outputFolder || 'C:/AuraPublisher_Renders',
      });

      setExportResult(result);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportResult({
        success: false,
        totalRows: 0,
        error: err.message || 'Error desconocido al exportar planilla.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getCategoryBadgeStyle = (category?: string) => {
    switch (category) {
      case 'peliculas':
        return {
          bg: 'rgba(244, 114, 182, 0.15)',
          text: '#f472b6',
          border: '1px solid rgba(244, 114, 182, 0.3)',
          icon: <Film size={11} />,
          label: 'Película',
        };
      case 'series':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          text: '#c084fc',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          icon: <Tv size={11} />,
          label: 'Serie',
        };
      case 'gamer':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          text: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          icon: <Gamepad2 size={11} />,
          label: 'Gaming',
        };
      case 'anime':
        return {
          bg: 'rgba(251, 146, 60, 0.15)',
          text: '#fb923c',
          border: '1px solid rgba(251, 146, 60, 0.3)',
          icon: <Sparkles size={11} />,
          label: 'Anime',
        };
      case 'musica':
        return {
          bg: 'rgba(74, 222, 128, 0.15)',
          text: '#4ade80',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          icon: <Music size={11} />,
          label: 'Música',
        };
      case 'deportes':
        return {
          bg: 'rgba(250, 204, 21, 0.15)',
          text: '#facc15',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          icon: <Trophy size={11} />,
          label: 'Deportes',
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          text: '#cbd5e1',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          icon: <Palette size={11} />,
          label: 'Arte',
        };
    }
  };

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
        gap: '20px',
      }}
    >
      {/* Header & Stats Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-primary)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              marginBottom: '4px',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>MOTOR DE PUBLICACIÓN MASIVA MERCADOLIBRE</span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
              margin: 0,
            }}
          >
            Catálogo & Títulos SEO Homologados
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Generación automática de títulos con degradación estricta a 60 caracteres, fichas técnicas persuasivas y matriz completa de variantes.
          </p>
        </div>

        {/* Big Action CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleExportMassiveExcel}
            disabled={isExporting || selectedTitles.length === 0}
            className="btn btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: '0 4px 20px var(--accent-primary-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: selectedTitles.length === 0 ? 0.6 : 1,
              cursor: selectedTitles.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <FileSpreadsheet size={18} />
            <span>
              {isExporting
                ? 'Exportando Planilla ML...'
                : '🚀 Exportar a Excel de MercadoLibre (.xlsx)'}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
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
              background: 'rgba(222, 35, 103, 0.15)',
              border: '1px solid rgba(222, 35, 103, 0.3)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🎬
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Títulos Seleccionados
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {selectedTitles.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>de {titles.length}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
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
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            📊
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Variantes Totales a Publicar
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {totalVariantsCount.toLocaleString('es-AR')} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>filas Excel</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
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
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            💎
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Rango de Precios
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              $14.900 — $47.400
            </div>
          </div>
        </div>
      </div>

      {/* Export Result Notification */}
      {exportResult && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            background: exportResult.success
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: exportResult.success
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : '1px solid rgba(239, 68, 68, 0.4)',
            color: exportResult.success ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {exportResult.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>
              {exportResult.success
                ? `¡Planilla masiva generada con éxito (${exportResult.totalRows} filas)! Guardada en: ${exportResult.filePath || exportResult.filename}`
                : `Error: ${exportResult.error}`}
            </span>
          </div>
          <button
            onClick={() => setExportResult(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          padding: '12px 18px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar por título, temática o SEO..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'peliculas', label: 'Películas' },
            { id: 'series', label: 'Series' },
            { id: 'gamer', label: 'Gaming' },
            { id: 'anime', label: 'Anime' },
          ].map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: isActive
                    ? '1px solid var(--accent-primary)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive
                    ? 'var(--accent-primary)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table: Taskapp Styled Publication Matrix */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '14px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredTitles.length > 0 && filteredTitles.every((t) => t.selected)}
                    onChange={handleSelectAll}
                    style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px', width: '60px' }}>Poster</th>
                <th style={{ padding: '14px 16px', minWidth: '180px' }}>Título Oficial</th>
                <th style={{ padding: '14px 16px', minWidth: '360px' }}>
                  Título SEO MercadoLibre (60 Max)
                </th>
                <th style={{ padding: '14px 16px', width: '120px' }}>Categoría</th>
                <th style={{ padding: '14px 16px', width: '110px' }}>Variantes</th>
                <th style={{ padding: '14px 16px', width: '130px' }}>Precio Rango</th>
                <th style={{ padding: '14px 16px', width: '90px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTitles.map((titleItem) => {
                const isSelected = !!titleItem.selected;
                const seoTitle = titleItem.seoTitle || '';
                const seoLength = seoTitle.length;
                const isOverLimit = seoLength > 60;
                const categoryBadge = getCategoryBadgeStyle(titleItem.category);

                return (
                  <tr
                    key={titleItem.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isSelected
                        ? 'rgba(222, 35, 103, 0.03)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(titleItem.id)}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Poster Thumbnail */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '58px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {titleItem.posterUrl ? (
                          <img
                            src={titleItem.posterUrl}
                            alt={titleItem.titulo}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Film size={18} color="#64748b" />
                        )}
                      </div>
                    </td>

                    {/* Official Title */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                        {titleItem.titulo}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {titleItem.titulo_original && titleItem.titulo_original !== titleItem.titulo
                          ? `${titleItem.titulo_original} • `
                          : ''}
                        {titleItem.anio || ''}
                      </div>
                    </td>

                    {/* Editable SEO Title with Live Counter */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            value={seoTitle}
                            onChange={(e) => handleUpdateSeoTitle(titleItem.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: isOverLimit
                                ? '1.5px solid #ef4444'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* Live Counter Badge */}
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isOverLimit
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isOverLimit ? '#f87171' : '#34d399',
                            border: isOverLimit
                              ? '1px solid rgba(239, 68, 68, 0.4)'
                              : '1px solid rgba(16, 185, 129, 0.3)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {seoLength}/60
                        </div>

                        {/* Regenerate SEO title button */}
                        <button
                          onClick={() => handleRegenerateSeoTitle(titleItem.id)}
                          title="Regenerar título SEO automático"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: categoryBadge.bg,
                          color: categoryBadge.text,
                          border: categoryBadge.border,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {categoryBadge.icon}
                        <span>{categoryBadge.label}</span>
                      </span>
                    </td>

                    {/* Variants Count */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Layers size={11} color="var(--accent-primary)" />
                        <span>32 variantes</span>
                      </span>
                    </td>

                    {/* Price Range */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                        $14.900 - $39.400
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setPreviewTitle(titleItem)}
                          title="Ver Ficha y Variantes"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '6px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(seoTitle);
                            setCopiedTitleId(titleItem.id);
                            setTimeout(() => setCopiedTitleId(null), 1500);
                          }}
                          title="Copiar Título SEO"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '6px',
                            color: copiedTitleId === titleItem.id ? '#34d399' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copiedTitleId === titleItem.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal: Ficha Técnica, Copy & Matriz de Variantes */}
      {previewTitle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#0d111a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '52px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {previewTitle.posterUrl ? (
                    <img
                      src={previewTitle.posterUrl}
                      alt={previewTitle.titulo}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Film size={18} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {previewTitle.titulo} {previewTitle.anio ? `(${previewTitle.anio})` : ''}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>
                    {previewTitle.seoTitle || generateMlSeoTitle(previewTitle.titulo)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewTitle(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Description Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Descripción Persuasiva para MercadoLibre
                  </label>

                  <button
                    onClick={() => {
                      const desc = generatePersuasiveDescription({
                        titulo: previewTitle.titulo,
                        titulo_original: previewTitle.titulo_original,
                        anio: previewTitle.anio,
                        generos: previewTitle.generos,
                        sinopsis: previewTitle.sinopsis,
                        finishType: previewTitle.finishType || 'resina',
                      });
                      navigator.clipboard.writeText(desc);
                      setCopiedDesc(true);
                      setTimeout(() => setCopiedDesc(false), 2000);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                  >
                    {copiedDesc ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    <span>{copiedDesc ? 'Copiado' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    fontFamily: 'inherit',
                  }}
                >
                  {generatePersuasiveDescription({
                    titulo: previewTitle.titulo,
                    titulo_original: previewTitle.titulo_original,
                    anio: previewTitle.anio,
                    generos: previewTitle.generos,
                    sinopsis: previewTitle.sinopsis,
                    finishType: previewTitle.finishType || 'resina',
                  })}
                </div>
              </div>

              {/* Variants Matrix Table Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Matriz de Variantes a Generar en Excel (Medidas × Acabados)
                </label>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '8px 12px' }}>SKU</th>
                        <th style={{ padding: '8px 12px' }}>Medida</th>
                        <th style={{ padding: '8px 12px' }}>Acabado</th>
                        <th style={{ padding: '8px 12px' }}>Precio Base</th>
                        <th style={{ padding: '8px 12px' }}>Precio Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pricingConfig.defaultSizes || ['25x25', '40x60', '50x50', '50x70', '60x40', '70x40', '80x45', '90x50']).flatMap((sizeId) => {
                        const sizeObj = ADAPTABLE_SIZES.find((s) => s.id === sizeId);
                        const basePrice = pricingConfig.basePrices?.[sizeId] ?? sizeObj?.defaultPrice ?? 24900;

                        return (pricingConfig.defaultFinishes || ['resina', 'vinilo_mate', 'vinilo_brillante', 'holografico']).map((finishId) => {
                          const isResina = finishId.includes('resina');
                          const isHolo = finishId.includes('holo');
                          const isBrillante = finishId.includes('brillante');
                          const finishName = isResina
                            ? 'Resina Epoxi Cristal'
                            : isHolo
                            ? 'Holográfico'
                            : isBrillante
                            ? 'Vinilo Brillante'
                            : 'Vinilo Mate';
                          const surcharge = isResina ? 4500 : isHolo ? 2500 : 0;
                          const finalPrice = basePrice + surcharge;
                          const skuFinish = isResina ? 'RESI' : isHolo ? 'HOLO' : isBrillante ? 'BRIL' : 'MATE';
                          const sku = `AURA-${previewTitle.titulo.toUpperCase().slice(0, 4)}-${sizeId.toUpperCase()}-${skuFinish}`;

                          return (
                            <tr key={`${sizeId}-${finishId}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{sku}</td>
                              <td style={{ padding: '6px 12px', color: '#ffffff', fontWeight: 600 }}>{sizeObj?.label || sizeId}</td>
                              <td style={{ padding: '6px 12px', color: '#38bdf8' }}>{finishName}</td>
                              <td style={{ padding: '6px 12px', color: '#94a3b8' }}>${basePrice.toLocaleString('es-AR')}</td>
                              <td style={{ padding: '6px 12px', color: '#34d399', fontWeight: 700 }}>${finalPrice.toLocaleString('es-AR')}</td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setPreviewTitle(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MassPublisherView;
