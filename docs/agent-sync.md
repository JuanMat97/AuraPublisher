# AuraPublisher — Agent Sync Ledger

> **Ledger de sincronización en tiempo real entre agentes (Antigravity, OpenCode, Hermes Agent).**  
> **Última actualización:** 2026-08-20T14:44:00-03:00  
> **Estado global:** Motor 3D PBR, Calibración de Mockups, Indexador de Catálogo y Exportador Excel 100% implementados y verificados.

---

## 1. Registro de Estado y Features

| Módulo / Feature | Archivo Principal | Estado | Verificación |
|---|---|---|---|
| **WebGL Room Engine (3D PBR)** | [`src/engine/webglRoomEngine.ts`](file:///H:/Projects/AuraPublisher/src/engine/webglRoomEngine.ts) | ✅ Completo | Resina líquida (`roughness: 0.002`, `clearcoat: 1.0`, `envMap: 6.0`, `specular: 3.0`), 4 luces dinámicas, quad de perspectiva con puntos de fuga. |
| **Pro Color Grading** | [`src/engine/colorGrading.ts`](file:///H:/Projects/AuraPublisher/src/engine/colorGrading.ts) | ✅ Completo | LUT 256 por canal RGB, 4 bandas tonales (Blacks, Shadows, Whites, Highlights), viñeta y balance de blancos. |
| **Catalog Scanner** | [`src/engine/catalogScanner.ts`](file:///H:/Projects/AuraPublisher/src/engine/catalogScanner.ts) | ✅ Completo | Scanner nativo IPC para `E:\AuraStudio\Cuadros` + fallback a 430+ títulos en cache embebido. |
| **Copywriting & SEO Generator** | [`src/engine/copyGenerator.ts`](file:///H:/Projects/AuraPublisher/src/engine/copyGenerator.ts) | ✅ Completo | Degradación estricta de 5 fases para títulos SEO MercadoLibre (`<= 60 caracteres`) y copy persuasivo. |
| **Excel Exporter (MLA 40 Cols)** | [`src/engine/excelExporter.ts`](file:///H:/Projects/AuraPublisher/src/engine/excelExporter.ts) | ✅ Completo | Inyección en plantilla `Publicar-08-13-09_35_15.xlsx` con mapeo exacto de 40 columnas y fórmulas. |
| **Library View** | [`src/components/Workspace/LibraryView.tsx`](file:///H:/Projects/AuraPublisher/src/components/Workspace/LibraryView.tsx) | ✅ Completo | Navegación por categorías, filtrado, selección de variantes y pósters. |
| **Mockup Grid View** | [`src/components/Workspace/MockupGridView.tsx`](file:///H:/Projects/AuraPublisher/src/components/Workspace/MockupGridView.tsx) | ✅ Completo | Previsualización y calibración interactiva de ambientes con canvas 3D. |
| **Mass Publisher View** | [`src/components/Workspace/MassPublisherView.tsx`](file:///H:/Projects/AuraPublisher/src/components/Workspace/MassPublisherView.tsx) | ✅ Completo | Panel de orquestación por lotes para generación masiva y exportación. |
| **Pricing Settings View** | [`src/components/Workspace/PricingSettingsView.tsx`](file:///H:/Projects/AuraPublisher/src/components/Workspace/PricingSettingsView.tsx) | ✅ Completo | Matriz de costos fijos, coeficientes de rentabilidad y dimensiones. |

---

## 2. In-Progress & Cross-Project Dependencies

- **Hosting / Storage de Mockups Renderizados**: Resolución del pipeline de subida pública de imágenes (URLs públicas para la columna `H: Fotos` en la planilla Excel de MercadoLibre).
- **Hermes Agent Ingest Sync**: Sincronización continua de nuevos lotes de posters y metadata JSON descargados en `E:\AuraStudio\Cuadros`.
- **AuraStudio Web Sync**: Compartición de presets de terminación (`finishPresets.ts`) y catálogo con la tienda web AuraStudio (`H:\Projects\AuraStudio`).

---

## 3. Next Immediate Action for Any Agent

> ⚡ **Cualquier agente que tome el control debe ejecutar la siguiente tarea sin necesidad de re-preguntar:**

1. **Validación de Compilación y Tipado**:
   - Ejecutar `npx tsc --noEmit` en `H:\Projects\AuraPublisher` para confirmar consistencia de tipos.
2. **Pipeline de Exportación Masiva**:
   - Verificar la integración entre `MassPublisherView.tsx` y `excelExporter.ts` al procesar lotes de más de 50 obras seleccionadas.
   - Probar la generación de planillas Excel de prueba y validar que la fórmula `=LEN(B...)` arroje siempre `<= 60` para todas las filas generadas.
3. **Sincronización con `E:\AuraStudio\Cuadros`**:
   - Si se agregan nuevas carpetas o títulos mediante Hermes Agent, ejecutar refresh en la vista de biblioteca (`LibraryView`) y verificar el correcto parseo de pósters.
