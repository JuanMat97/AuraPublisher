import React, { useMemo } from 'react';
import { Panel } from './Panel';

export interface FormatMetadata {
  panels: number;
}

export interface SizeMetadata {
  w: number;
  h: number;
}

export interface PolyptychProps {
  textureUrl: string | null;
  finish: string;
  resina?: boolean;
  format?: FormatMetadata;
  panelsCount?: number;
  size: SizeMetadata;
  orientation?: 'vertical' | 'horizontal' | 'cuadrado';
  gap?: number;
  maskUrl?: string | null;
  stackDirection?: 'horizontal' | 'vertical';
  showAura?: boolean;
  auraScale?: number;
}

export function getOrientedSize(
  size: SizeMetadata,
  orientation?: 'vertical' | 'horizontal' | 'cuadrado',
  imgAspect?: number
): SizeMetadata {
  const w = size.w;
  const h = size.h;
  if (!w || !h) return size;

  if (imgAspect && imgAspect > 0 && orientation !== 'cuadrado') {
    if (orientation === 'horizontal') {
      const baseW = Math.max(w, h);
      return { w: baseW, h: Math.round((baseW / imgAspect) * 10) / 10 };
    }
    if (orientation === 'vertical') {
      const baseH = Math.max(w, h);
      return { w: Math.round((baseH * imgAspect) * 10) / 10, h: baseH };
    }
  }

  if (orientation === 'horizontal') {
    return { w: Math.max(w, h), h: Math.min(w, h) };
  }
  if (orientation === 'vertical') {
    return { w: Math.min(w, h), h: Math.max(w, h) };
  }
  if (orientation === 'cuadrado') {
    const side = Math.max(w, h);
    return { w: side, h: side };
  }
  return size;
}

export function Polyptych({
  textureUrl,
  finish,
  resina = false,
  format,
  panelsCount,
  size,
  orientation = 'vertical',
  gap = 4,
  maskUrl,
  stackDirection = 'horizontal',
  showAura = true,
  auraScale = 1,
}: PolyptychProps) {
  const total = format?.panels ?? panelsCount ?? 1;

  const panels = useMemo(() => {
    return Array.from({ length: total }, (_, i) => i);
  }, [total]);

  const adjustedSize = useMemo<SizeMetadata>(() => {
    if (stackDirection === 'vertical') {
      return size;
    }
    return getOrientedSize(size, orientation);
  }, [size, orientation, stackDirection]);

  return (
    <group>
      {panels.map((i) => (
        <Panel
          key={i}
          textureUrl={textureUrl}
          finish={finish}
          resina={resina}
          size={adjustedSize}
          panelIndex={i}
          totalPanels={total}
          gap={gap}
          maskUrl={maskUrl}
          stackDirection={stackDirection}
          showAura={showAura}
          auraScale={auraScale}
        />
      ))}
    </group>
  );
}

