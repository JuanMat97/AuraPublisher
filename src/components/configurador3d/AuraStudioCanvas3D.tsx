import React, { useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Polyptych } from './Polyptych';
import { LightingRig } from './LightingRig';
import { AmbientLightMode, ReflectionType } from '../../types/catalog';
import * as THREE from 'three';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Canvas error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', color: '#a0a0b0', fontSize: '11px' }}>
          Reiniciando visor 3D...
        </div>
      );
    }
    return this.props.children;
  }
}

interface AuraStudioCanvas3DProps {
  textureUrl: string | null;
  finish?: string;
  resina?: boolean;
  panelsCount?: number;
  size?: { w: number; h: number };
  gap?: number;
  mood?: AmbientLightMode | 'estudio';
  reflectionType?: ReflectionType;
  rotationY?: number;
}

function ConstellationBackdrop() {
  const particles = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color('#00f0ff');
    const pink = new THREE.Color('#de2367');
    const white = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = -0.5 - Math.random() * 2;

      const pick = Math.random();
      const col = pick > 0.6 ? cyan : pick > 0.3 ? pink : white;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    return { positions, colors };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const AuraStudioCanvas3D: React.FC<AuraStudioCanvas3DProps> = ({
  textureUrl,
  finish = 'brillante',
  resina = true,
  panelsCount = 1,
  size = { w: 90, h: 50 },
  gap = 3,
  mood = 'day',
  reflectionType = 'studio_grid',
  rotationY = 0,
}) => {
  return (
    <CanvasErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a14' }}>
        <Canvas
          camera={{ position: [0, 0, 1.8], fov: 36 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.10,
            outputColorSpace: 'srgb',
            preserveDrawingBuffer: true,
          }}
        >
          <LightingRig mood={mood} reflectionType={reflectionType} />
          <ConstellationBackdrop />

          <group rotation={[0.08, rotationY, 0]}>
            <Polyptych
              textureUrl={textureUrl}
              finish={finish}
              resina={resina}
              panelsCount={panelsCount}
              size={size}
              gap={gap}
              showAura={true}
            />
          </group>

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={0.8}
            maxDistance={4.0}
            maxPolarAngle={Math.PI / 2 + 0.15}
            minPolarAngle={Math.PI / 3 - 0.2}
          />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
};
