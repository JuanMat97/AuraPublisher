import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { searchUnsplashPhotos, UnsplashPhoto } from '../../services/unsplashService';
import { Search, Download, Sparkles, ExternalLink, Image as ImageIcon } from 'lucide-react';

export const UnsplashHubModal: React.FC = () => {
  const { setSelectedImage, addCustomEnvironment, setCurrentView } = useAppStore();
  const [query, setQuery] = useState('modern living room interior wall');
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'art'>('rooms');

  useEffect(() => {
    handleSearch();
  }, [activeTab]);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const q = activeTab === 'rooms'
        ? (query || 'modern living room interior wall')
        : (query || 'abstract acrylic art 4k');
      const res = await searchUnsplashPhotos(q, 1, 24);
      setPhotos(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAsArtwork = (photo: UnsplashPhoto) => {
    setSelectedImage({
      path: photo.urls.regular,
      filename: `unsplash_${photo.id}.jpg`,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.width / photo.height,
      format: 'jpg',
    });
    setCurrentView('studio');
  };

  const handleUseAsEnvironment = (photo: UnsplashPhoto) => {
    addCustomEnvironment({
      id: `unsplash_env_${photo.id}`,
      name: photo.alt_description || 'Habitación Unsplash HD',
      category: 'living',
      imageUrl: photo.urls.regular,
      positions: [
        {
          id: `pos_${photo.id}`,
          name: 'Pared Principal',
          quad: {
            topLeft: { x: 0.3, y: 0.16 },
            topRight: { x: 0.7, y: 0.16 },
            bottomRight: { x: 0.7, y: 0.48 },
            bottomLeft: { x: 0.3, y: 0.48 },
          },
          shadowIntensity: 0.55,
          shadowBlur: 24,
          shadowOffsetX: 2,
          shadowOffsetY: 16,
        },
      ],
      isCustom: true,
    });
    setCurrentView('studio');
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', height: 'calc(100vh - 60px)', background: 'transparent' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
            <Sparkles size={14} />
            <span>EXPLORADOR DIRECTO DE UNSPLASH API</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f0f0f0' }}>
            Hub de Recursos Unsplash HD
          </h1>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button
            className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('rooms'); setQuery('modern living room interior wall'); }}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            Habitaciones & Paredes
          </button>
          <button
            className={`btn ${activeTab === 'art' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('art'); setQuery('abstract acrylic painting'); }}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            Obras de Arte
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="surface-workspace" style={{ padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px', background: 'rgba(255, 255, 255, 0.04)' }}>
        <input
          type="text"
          className="input-light"
          placeholder={activeTab === 'rooms' ? 'Buscar ambientes (ej: minimal bedroom, luxury living, art museum)...' : 'Buscar obras (ej: cyberpunk city, abstract marble, ocean waves)...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleSearch} disabled={isLoading}>
          <Search size={15} />
          <span>{isLoading ? 'Buscando...' : 'Buscar'}</span>
        </button>
      </div>

      {/* Photos Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {photos.map((photo) => (
          <div key={photo.id} className="light-card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
            <div style={{ position: 'relative', height: '160px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
              <img
                src={photo.urls.small}
                alt={photo.alt_description || 'Unsplash'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span className="pill-badge pill-indigo" style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '9px' }}>
                📸 {photo.user.name}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              {activeTab === 'rooms' ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUseAsEnvironment(photo)}
                  style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                >
                  <Download size={12} />
                  <span>Usar de Pared</span>
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUseAsArtwork(photo)}
                  style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                >
                  <ImageIcon size={12} />
                  <span>Cargar Obra</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
