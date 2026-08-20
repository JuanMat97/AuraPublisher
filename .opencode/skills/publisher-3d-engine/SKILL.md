---
name: publisher-3d-engine
description: Technical architecture and implementation guide for the 3D WebGL Compositor, PBR materials, perspective wall quad calculation, multi-light system, and photographic color grading LUTs.
---

# 3D WebGL Engine & Compositor Skill — AuraPublisher

Esta guía contiene la especificación matemática y la arquitectura del motor de renderizado 3D WebGL y composición fotográfica en tiempo real de AuraPublisher.

---

## 1. Materiales PBR (Physically Based Rendering) y Presets de Acabado

El motor 3D utiliza shaders basados en Three.js `MeshPhysicalMaterial` con capas separadas para la reproducción cromática del arte y el specular coat físico.

```text
                               ┌──────────────────────────────────────────────┐
                               │       Capa 2: Clearcoat Specular             │
                               │  (Reflejos HDR, Especularidad, Resina Epoxi) │
                               ├──────────────────────────────────────────────┤
                               │       Capa 1: Textura de Arte Fine Art       │
                               │    (Fidelidad cromática 100% sRGB / DCI-P3)  │
                               ├──────────────────────────────────────────────┤
                               │       Capa 0: Bastidor de Madera Maciza      │
                               │          (Cantos Envolventes con AO)         │
                               └──────────────────────────────────────────────┘
```

### Tabla de Parámetros Físicos por Acabado

| Acabado | `roughness` | `clearcoat` | `clearcoatRoughness` | `envMapIntensity` | `specularIntensity` | `iridescence` | `iridescenceIOR` | `colorBoost` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Resina Epoxi (Vidrio Líquido)** | `0.002` | `1.00` | `0.002` | `6.00` | `3.00` | `0.00` | `1.30` | `1.08` |
| **Vinilo Brillante (Glossy)** | `0.100` | `0.88` | `0.030` | `2.20` | `1.90` | `0.00` | `1.30` | `1.00` |
| **Vinilo Mate (Satinado)** | `0.420` | `0.30` | `0.150` | `0.90` | `0.90` | `0.00` | `1.30` | `1.00` |
| **Vinilo Tornasolado (Holo)** | `0.150` | `0.70` | `0.060` | `2.50` | `1.50` | `1.00` | `1.45` | `1.00` |

### Texturas de Canto Envolvente (Wrap Borde Continuo)
Para simular el bastidor artesanal de 1 cm a 2 cm de profundidad:
- Se extrae una franja perimetral de la imagen original correspondiente al espesor físico.
- Se aplican gradientes de **Oclusión Ambiental (Ambient Occlusion)** y pliegues oscuros en las 4 caras laterales (+X, -X, +Y, -Y) para reproducir el quiebre de la tela sobre la madera maciza.

---

## 2. Cálculo de Plano de Pared (Perspective Wall Quad)

Para insertar cuadros en paredes con perspectiva y ángulo real de fuga arquitectónica:

```text
pTL (Top-Left) ───────────────► u ───────────────► pTR (Top-Right)
      │                                                  │
      ▼                                                  ▼
      v                                                  v
      │                                                  │
pBL (Bottom-Left) ────────────► u ───────────────► pBR (Bottom-Right)
```

### Interpolación Bilineal en el Cuadrilátero
Dado un cuadrilátero normalizado en el plano de la pared con esquinas $(p_{TL}, p_{TR}, p_{BR}, p_{BL})$ y coordenadas normalizadas $(u, v) \in [0, 1] \times [0, 1]$:

$$\text{Top}(u) = p_{TL} + u \cdot (p_{TR} - p_{TL})$$
$$\text{Bottom}(u) = p_{BL} + u \cdot (p_{BR} - p_{BL})$$
$$\text{Point}(u, v) = \text{Top}(u) + v \cdot (\text{Bottom}(u) - \text{Top}(u))$$

### Malla de Deformación Afín 2-Triangle ($16 \times 16$)
Para eliminar distorsiones trapezoidales sin coste de cómputo en Canvas 2D, el plano se subdivide en una cuadrícula de $16 \times 16$ celdas donde cada una se proyecta como dos triángulos afines utilizando transformaciones directas `ctx.transform(a, b, c, d, e, f)`.

---

## 3. Sistema Multi-Luz 3D y Proyección Vectorial de Sombras

El sistema soporta hasta **4 fuentes de luz simultáneas** con intensidades independientes, color, posición esférica 3D $(x, y, z)$ e influencia sobre la sombra física proyectada.

### Cálculo del Vector de Sombra Proyectada

Dado el ángulo de la luz principal $\theta$ (`angleDeg`), la inclinación del cuadro $\phi$ (`pitchDeg`), el ángulo de la pared $\psi$ (`wallAngleDeg`) y la distancia de separación $Z$:

$$\text{dropX} = -\cos(\theta) \cdot d_{\text{base}} \cdot (1 + Z \cdot 0.20) + \sin(\psi) \cdot 32$$
$$\text{dropY} = \sin(\theta) \cdot d_{\text{base}} \cdot (1 + Z \cdot 0.20) + \sin(\phi) \cdot 40$$

### Presets de Sombra Proyectada

1. **`parallel`:** Sombra direccional continua proyectada sobre el plano de la pared sin artefactos de capas superpuestas.
2. **`glow`:** Halo difuso perimetral con caída radial suave.
3. **`outline`:** Sombra de contacto ceñida al contorno del bastidor.
4. **`curved`:** Deformación cuadrática en las esquinas inferiores para simular relieve curvo.
5. **`floating`:** Gradiente radial inferior para cuadros apoyados sobre estantes o repisas.
6. **`angled`:** Proyección angular de luz lateral marcada.
7. **`bottom_drop`:** Caída vertical directa.
8. **`shelfContactShadow`:** Línea de oclusión de contacto ultra-precisa de 2px en la base del marco.

---

## 4. Mapas de Reflexión Raytracing HDR Equirectangulares

El motor sintetiza mapas de entorno HDR equirectangulares de $2048 \times 1024$ px con rotación continua de 360° para generar reflejos especulares de alta definición:

### Los 8 Presets Arquitectónicos de Ventana

1. **`industrial_loft`:** Ventanal de hierro con cuadrícula 3x3 y montantes oscuros.
2. **`panoramic_window`:** Ventanal piso-techo sin marco con gradiente atmosférico exterior.
3. **`sunny_balcony`:** Luz solar intensa con silueta orgánica de follaje de árboles exteriores.
4. **`french_window`:** Ventana clásica con arco superior y molduras ornamentales.
5. **`double_corner`:** Ventanal en esquina con dos ejes de luz a 90°.
6. **`skylight_zenith`:** Tragaluz de techo cenital con haz difuso superior.
7. **`gallery_track`:** Riel de iluminación focal de museo con 3 proyectores directos.
8. **`warm_lamp`:** Lámpara de pie interior con cono de luz cálida de 2700K.

---

## 5. Motor de Gradación de Color Fotográfico Profesional (LUTs)

AuraPublisher implementa Look-Up Tables (LUT) de 256 entradas por canal (R, G, B) para realizar ajustes fotográficos a 60 FPS con **cero pérdida de rendimiento** y passthrough exacto bit a bit en estado neutro.

### Curvas Tonales Implementadas

```text
Canal Tonal      Fórmula Matemática
───────────────  ──────────────────────────────────────────────────────────────────────────
Blacks           Cutoff lineal y elevación del punto negro base: x' = bCutoff + x·(1 - bCutoff)
Shadows (Toe)    Curva senoidal de pie: Δx = sWeight · sin(π·x) · (1 - 0.35·x) en [0, 0.55]
Brightness       Offset gamma midtone: x' = x^(2^(-br·0.85))
Contrast         Curva sigmoidea centrada: S(x) = 1 / (1 + exp(-k·(x - 0.5)))
Highlights       Curva de hombro (Shoulder): Δx = hWeight · sin(π·(x - 0.45)/0.55) en [0.45, 1.0]
Whites           Ganancia en altas luces y recorte del blanco máximo (White point clipping)
White Balance    Desplazamiento directo por canal: Temp (+R, -B) y Tint (+M, -G)
Hue/Saturation   Matriz de rotación en espacio YIQ con preservación estricta de luminancia
Vignette         Atenuación cuadrática suave hacia las esquinas exteriores
```

### Optimización de Rendimiento
- Procesamiento en bloques directos de 32 bits (`Uint32Array` sobre `ImageData.data.buffer`) que reduce el tiempo de postprocesado a menos de 2 milisegundos en resoluciones $1920 \times 1920$ px.
