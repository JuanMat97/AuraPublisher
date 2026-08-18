import React from 'react';
import { Environment, ContactShadows, Lightformer } from '@react-three/drei';
import type { AmbientLightMode, ReflectionType } from '../../types/catalog';

export type Mood = 'estudio' | 'dia' | 'calido' | 'noche';

export interface LightingRigProps {
  preset?: Mood | 'studio' | 'warm' | 'natural' | AmbientLightMode | string;
  mood?: Mood | 'studio' | 'warm' | 'natural' | AmbientLightMode | string;
  hero?: boolean;
  reflectionType?: ReflectionType | string;
}

const MOOD_MAP: Record<string, Mood> = {
  studio: 'estudio',
  estudio: 'estudio',
  natural: 'dia',
  day: 'dia',
  dia: 'dia',
  warm: 'calido',
  warm_home: 'calido',
  sunset: 'calido',
  calido: 'calido',
  nordic_cold: 'estudio',
  neon_gamer: 'noche',
  night: 'noche',
  noche: 'noche',
};

export function LightingRig({ preset, mood: moodProp, hero = false }: LightingRigProps) {
  const activeKey = moodProp || preset || 'estudio';
  const mood: Mood = MOOD_MAP[activeKey] ?? 'estudio';
  const envRes = 512;

  return (
    <>
      <ambientLight intensity={0.3} color="#FFF5EA" />
      <ContactShadows
        position={[0, hero ? -1.5 : -0.6, 0]}
        opacity={hero ? 0.35 : 0.25}
        scale={15}
        blur={hero ? 3.5 : 3.0}
        far={hero ? 5 : 4}
      />

      {mood === 'dia' && (
        <>
          <directionalLight
            position={[4, 7, 5]}
            intensity={1.6}
            color="#FFF5EA"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-4, 3, -3]} intensity={0.4} color="#FFE8D0" />
          <pointLight position={[2, 2, 2.5]} intensity={0.5} color="#FFD9A0" distance={5} />

          {/* Lightformers vectoriales de alta nitidez para reflejos brillantes */}
          <Environment resolution={envRes}>
            <Lightformer form="rect" intensity={3.5} color="#FFFFFF" position={[0, 2, 3]} scale={[5, 3.5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={2.2} color="#FFF0DB" position={[-5, 4, 4]} scale={[10, 6, 1]} target={[0, 0, 0]} />
            <Lightformer form="ring" intensity={1.8} color="#FFFFFF" position={[5, 3, 3]} scale={[5, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={1.0} color="#FFE8D0" position={[0, -4, 4]} scale={[12, 3, 1]} />
          </Environment>
        </>
      )}

      {mood === 'calido' && (
        <>
          <directionalLight
            position={[6, 8, 6]}
            intensity={1.8}
            color="#FFF0DB"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#FFB74D" />
          <pointLight position={[0, 4, 3]} intensity={0.6} color="#FFE0B2" distance={6} />
          <pointLight position={[-3, 1.5, 2]} intensity={0.4} color="#FFB74D" distance={4} />

          <Environment resolution={envRes}>
            <Lightformer form="rect" intensity={3.0} color="#FFF0DB" position={[-5, 4, 4]} scale={[10, 6, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={3.5} color="#FFD9A0" position={[6, 3, 4]} scale={[10, 6, 1]} target={[0, 0, 0]} />
            <Lightformer form="ring" intensity={2.0} color="#FFFFFF" position={[0, 6, 2]} scale={[5, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={1.2} color="#FFB74D" position={[0, -4, 4]} scale={[12, 3, 1]} />
          </Environment>
        </>
      )}

      {mood === 'noche' && (
        <>
          <ambientLight intensity={0.08} color="#1A1829" />
          <spotLight position={[0, 5, 5]} angle={0.55} penumbra={0.5} intensity={2.4} color="#FFE0B2" castShadow />
          <pointLight position={[-3, 2, 2]} intensity={0.7} color="#FF9800" distance={4} />
          <Environment resolution={envRes}>
            <Lightformer form="rect" intensity={3.5} color="#FFD9A0" position={[0, 4, 4]} scale={[8, 8, 1]} />
            <Lightformer form="circle" intensity={2.5} color="#FFFFFF" position={[-4, 2, 3]} scale={[4, 4, 1]} />
          </Environment>
        </>
      )}

      {mood === 'estudio' && (
        <>
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.8}
            color="#FFFFFF"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#FFF0DB" />
          <directionalLight position={[0, 3, -4]} intensity={0.3} color="#FFFFFF" />
          <Environment resolution={envRes}>
            <Lightformer form="rect" intensity={3.5} color="#FFFFFF" position={[0, 5, 5]} scale={[12, 12, 1]} />
            <Lightformer form="rect" intensity={3.0} color="#FFF0DB" position={[0, 1.5, 3]} scale={[5, 3.5, 1]} />
            <Lightformer form="circle" intensity={1.8} color="#FFFFFF" position={[4, 3, 3]} scale={[4, 4, 1]} />
          </Environment>
        </>
      )}
    </>
  );
}

