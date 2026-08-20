import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  FolderArchive,
  Search,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Rocket,
  Sliders,
  Layers,
  Filter,
  Check,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { processFileToSelectedImage, getSampleArtwork } from '../../utils/imageLoader';
import { SelectedImage } from '../../vite-env';

interface LibraryItem {
  id: string;
  title: string;
  category: 'peliculas' | 'anime' | 'gamer' | 'abstracto' | 'paisajes' | 'musica';
  aspectRatio: 'horizontal' | 'vertical' | 'square';
  dimensionsSuggested: string[];
  thumbnail: string;
  isSample?: boolean;
}

const BUILTIN_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib_1',
    title: 'Olas de Mármol Dorado & Azul Noche',
    category: 'abstracto',
    aspectRatio: 'vertical',
    dimensionsSuggested: ['50x70', '70x100', '40x60'],
    thumbnail: getSampleArtwork('abstract').path,
    isSample: true,
  },
  {
    id: 'lib_2',
    title: 'Geometría Contemporánea & Terracota',
    category: 'abstracto',
    aspectRatio: 'square',
    dimensionsSuggested: ['80x80', '50x50', '25x25'],
    thumbnail: getSampleArtwork('portrait').path,
    isSample: true,
  },
  {
    id: 'lib_3',
    title: 'Océano Cristalino en Resina Epoxi',
    category: 'paisajes',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['90x50', '100x70', '120x60', '80x45'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_4',
    title: 'Cyberpunk Neon Samurai — Neo Tokyo 2099',
    category: 'gamer',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['80x45', '90x50', '100x70'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_5',
    title: 'Ataque de los Titanes — Shingeki no Kyojin',
    category: 'anime',
    aspectRatio: 'vertical',
    dimensionsSuggested: ['50x70', '70x100'],
    thumbnail: getSampleArtwork('abstract').path,
    isSample: true,
  },
  {
    id: 'lib_6',
    title: 'Interstellar — Agujero Negro Gargantua',
    category: 'peliculas',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['90x50', '120x60'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_7',
    title: 'The Dark Knight — Joker Gotham City',
    category: 'peliculas',
    aspectRatio: 'vertical',
    dimensionsSuggested: ['50x70', '70x100'],
    thumbnail: getSampleArtwork('abstract').path,
    isSample: true,
  },
  {
    id: 'lib_8',
    title: 'Studio Ghibli — El Viaje de Chihiro',
    category: 'anime',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['90x50', '70x40'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_9',
    title: 'Pink Floyd — The Dark Side of the Moon',
    category: 'musica',
    aspectRatio: 'square',
    dimensionsSuggested: ['80x80', '50x50'],
    thumbnail: getSampleArtwork('portrait').path,
    isSample: true,
  },
  {
    id: 'lib_10',
    title: 'Bosque Nórdico en Neblina Alpina',
    category: 'paisajes',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['100x70', '90x50'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_11',
    title: 'Elden Ring — Árbol Áureo & Tierras Intermedias',
    category: 'gamer',
    aspectRatio: 'horizontal',
    dimensionsSuggested: ['90x50', '120x60'],
    thumbnail: getSampleArtwork('landscape').path,
    isSample: true,
  },
  {
    id: 'lib_12',
    title: 'Pulp Fiction — Vincent & Jules',
    category: 'peliculas',
    aspectRatio: 'vertical',
    dimensionsSuggested: ['50x70', '40x60'],
    thumbnail: getSampleArtwork('abstract').path,
    isSample: true,
  },
];

export const LibraryView: React.FC = () => {
  const {
    setSelectedImage,
    selectedLibraryTitles,
    toggleSelectedLibraryTitle,
    selectAllLibraryTitles,
    clearSelectedLibraryTitles,
    setActiveView,
    setCurrentView,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRatio, setSelectedRatio] = useState<string>('all');
  const [customItems, setCustomItems] = useState<LibraryItem[]>([]);

  const allItems = useMemo(() => {
    return [...customItems, ...BUILTIN_LIBRARY_ITEMS];
  }, [customItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesRatio = selectedRatio === 'all' || item.aspectRatio === selectedRatio;
      return matchesSearch && matchesCategory && matchesRatio;
    });
  }, [allItems, searchQuery, selectedCategory, selectedRatio]);

  const handleUploadFiles = () => {
    if (window.electronAPI) {
      window.electronAPI.openImage().then((img) => {
        if (img) {
          addUploadedImageToLibrary(img);
        }
      });
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        for (const file of files) {
          const img = await processFileToSelectedImage(file);
          addUploadedImageToLibrary(img);
        }
      };
      input.click();
    }
  };

  const addUploadedImageToLibrary = (img: SelectedImage) => {
    const ratio = img.aspectRatio > 1.1 ? 'horizontal' : img.aspectRatio < 0.9 ? 'vertical' : 'square';
    const newItem: LibraryItem = {
      id: 'custom_' + Date.now() + Math.random().toString(36).substring(2, 6),
      title: img.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      category: 'abstracto',
      aspectRatio: ratio,
      dimensionsSuggested: ratio === 'horizontal' ? ['90x50', '100x70', '60x40'] : ratio === 'vertical' ? ['50x70', '70x100'] : ['80x80', '50x50'],
      thumbnail: img.path,
    };
    setCustomItems((prev) => [newItem, ...prev]);
    setSelectedImage(img);
  };

  const handleOpenInMockups = (item: LibraryItem) => {
    const sample = item.aspectRatio === 'horizontal' ? getSampleArtwork('landscape') : item.aspectRatio === 'square' ? getSampleArtwork('portrait') : getSampleArtwork('abstract');
    const selected: SelectedImage = {
      path: item.thumbnail,
      filename: `${item.title.replace(/\s+/g, '_')}.jpg`,
      width: sample.width,
      height: sample.height,
      aspectRatio: sample.aspectRatio,
      format: 'jpg',
    };
    setSelectedImage(selected);
    if (setActiveView) setActiveView('mockups');
    else setCurrentView('mockups');
  };

  const handleOpenInPublisher = (item: LibraryItem) => {
    const sample = item.aspectRatio === 'horizontal' ? getSampleArtwork('landscape') : item.aspectRatio === 'square' ? getSampleArtwork('portrait') : getSampleArtwork('abstract');
    const selected: SelectedImage = {
      path: item.thumbnail,
      filename: `${item.title.replace(/\s+/g, '_')}.jpg`,
      width: sample.width,
      height: sample.height,
      aspectRatio: sample.aspectRatio,
      format: 'jpg',
    };
    setSelectedImage(selected);
    if (setActiveView) setActiveView('publisher');
    else setCurrentView('publisher');
  };

  const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedLibraryTitles.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      clearSelectedLibraryTitles();
    } else {
      selectAllLibraryTitles(filteredItems.map((item) => item.id));
    }
  };

  const getCategoryPill = (category: string) => {
    switch (category) {
      case 'anime':
        return <span className="pill pill-indigo">Anime & Manga</span>;
      case 'gamer':
        return <span className="pill pill-red">Gamer & 3D</span>;
      case 'peliculas':
        return <span className="pill pill-amber">Cine & Series</span>;
      case 'paisajes':
        return <span className="pill pill-green">Paisajes</span>;
      case 'musica':
        return <span className="pill pill-blue">Música</span>;
      default:
        return <span className="pill pill-indigo">Arte Visual</span>;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#ffffff' }}>
      {/* Top Banner & Header */}
      <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Biblioteca de Obras & Catálogo
              </h1>
              <span className="pill pill-blue">
                313 Títulos Disponibles
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#475569' }}>
              Catálogo curado para MercadoLibre con variantes de tamaño automáticas, mockups 3D hiperrealistas y resina epoxi.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleUploadFiles}>
              <UploadCloud size={15} />
              <span>Importar Obras</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar obras por título, categoría o proporción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px', height: '36px' }}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'all', label: 'Todos (313)' },
              { id: 'peliculas', label: 'Películas' },
              { id: 'anime', label: 'Anime' },
              { id: 'gamer', label: 'Gamer' },
              { id: 'abstracto', label: 'Abstracto' },
              { id: 'paisajes', label: 'Paisajes' },
              { id: 'musica', label: 'Música' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    background: isSelected ? '#e0f2fe' : '#ffffff',
                    color: isSelected ? '#0284c7' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Aspect Ratio Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'all', label: 'Todo' },
              { id: 'horizontal', label: 'Horizontal' },
              { id: 'vertical', label: 'Vertical' },
              { id: 'square', label: 'Cuadrado' },
            ].map((r) => {
              const isSelected = selectedRatio === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRatio(r.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    border: 'none',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#0f172a' : '#64748b',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk Action Header & Stats Banner */}
      <div
        style={{
          padding: '10px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleToggleSelectAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: isAllFilteredSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                background: isAllFilteredSelected ? '#3b82f6' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              {isAllFilteredSelected && <Check size={12} />}
            </div>
            <span>Seleccionar visibles ({filteredItems.length})</span>
          </button>

          {selectedLibraryTitles.length > 0 && (
            <span className="pill pill-blue">
              {selectedLibraryTitles.length} seleccionados
            </span>
          )}
        </div>

        {selectedLibraryTitles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (setActiveView) setActiveView('mockups');
                else setCurrentView('mockups');
              }}
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              <ImageIcon size={13} color="#3b82f6" />
              <span>Generar Mockups ({selectedLibraryTitles.length})</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => {
                if (setActiveView) setActiveView('publisher');
                else setCurrentView('publisher');
              }}
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              <Rocket size={13} />
              <span>Publicar Lote ML ({selectedLibraryTitles.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of Artwork Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredItems.map((item) => {
            const isSelected = selectedLibraryTitles.includes(item.id);
            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  boxShadow: isSelected ? '0 8px 24px rgba(59, 130, 246, 0.15)' : 'var(--shadow-card)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Thumbnail Header */}
                <div
                  style={{
                    position: 'relative',
                    height: '180px',
                    background: '#0f172a',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />

                  {/* Selection Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectedLibraryTitle(item.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: isSelected ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#ffffff' : 'transparent',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Check size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                  </button>

                  {/* Aspect Ratio Badge */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.aspectRatio}
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getCategoryPill(item.category)}
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                      {item.dimensionsSuggested.length} formatos
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      lineHeight: 1.4,
                      minHeight: '40px',
                    }}
                  >
                    {item.title}
                  </h3>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {item.dimensionsSuggested.map((dim) => (
                      <span
                        key={dim}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        {dim} cm
                      </span>
                    ))}
                  </div>

                  {/* Action Row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenInMockups(item)}
                      style={{ flex: 1, padding: '7px 8px', fontSize: '11px' }}
                    >
                      <ImageIcon size={13} color="#3b82f6" />
                      <span>Mockups 3D</span>
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenInPublisher(item)}
                      style={{ flex: 1, padding: '7px 8px', fontSize: '11px' }}
                    >
                      <Rocket size={13} />
                      <span>Publicar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LibraryView;