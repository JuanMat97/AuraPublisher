---
name: mercadolibre-publishing
description: Complete specification and operational guide for MercadoLibre marketplace bulk publishing, 60-character SEO title degradation rule, official Excel template structure, SKU generation, and variant matrices.
---

# MercadoLibre Publishing Skill — AuraPublisher

Esta guía contiene la especificación técnica completa y las directivas obligatorias para la publicación masiva y optimizada de cuadros decorativos en MercadoLibre Argentina (MLA), siguiendo la plantilla oficial de catálogo y garantizando máxima indexación SEO, cumplimiento estricto de caracteres y precisión en variantes.

---

## 1. Regla SEO de Títulos (Máximo 60 Caracteres)

MercadoLibre penaliza o rechaza títulos con más de 60 caracteres. El algoritmo de titulación de AuraPublisher implementa una **degradación elegante de 5 etapas** para garantizar que ningún título supere los 60 caracteres bajo ninguna circunstancia, preservando siempre la marca `Aura Studio` mientras el espacio lo permita.

### Prefijos según Acabado

| Acabado | Prefijo Completo | Prefijo Compacto |
| :--- | :--- | :--- |
| **Resina Epoxi** | `Cuadro Resina Epoxi Premium` | `Cuadro Resina Epoxi` |
| **Vinilo (Mate / Brillante)** | `Cuadro Vinilico Premium HD` | `Cuadro Vinilico HD` |
| **Set / Políptico** | `Cuadro Set {Tríptico\|Díptico}` | `Set {Tríptico\|Díptico}` |

### Algoritmo de Degradación de 5 Fases

```text
Entrada: Titulo = "{Tema/Obra}", Acabado = "{resina|vinilo}"

[Fase 1] Título completo + Marca completa:
  "{PrefijoCompleto} {Titulo} Aura Studio"
  └─ ¿Longitud <= 60? → RETORNAR TÍTULO.

[Fase 2] Título completo + Marca corta:
  "{PrefijoCompleto} {Titulo} Aura St"
  └─ ¿Longitud <= 60? → RETORNAR TÍTULO.

[Fase 3] Título completo sin marca:
  "{PrefijoCompleto} {Titulo}"
  └─ ¿Longitud <= 60? → RETORNAR TÍTULO.

[Fase 4] Prefijo compacto sin "Premium":
  "{PrefijoCompacto} {Titulo}"
  └─ ¿Longitud <= 60? → RETORNAR TÍTULO.

[Fase 5] Truncado inteligente en límite de palabra:
  Tomar primeros 60 caracteres de Fase 4.
  Buscar último espacio (' ') después del carácter 20.
  Recortar en el espacio y limpiar bordes.
  Resultado final garantizado <= 60 caracteres.
```

### Ejemplos de Degradación

1. **Obra Corta:** `"Pulp Fiction"`
   - *Fase 1:* `Cuadro Vinilico Premium HD Pulp Fiction Aura Studio` (54 chars) → **Aprobado**.
2. **Obra Mediana:** `"The Dark Knight Trilogia"`
   - *Fase 1:* `Cuadro Resina Epoxi Premium The Dark Knight Trilogia Aura Studio` (66 chars) → Excede.
   - *Fase 2:* `Cuadro Resina Epoxi Premium The Dark Knight Trilogia Aura St` (62 chars) → Excede.
   - *Fase 3:* `Cuadro Resina Epoxi Premium The Dark Knight Trilogia` (54 chars) → **Aprobado**.
3. **Obra Larga:** `"Grand Theft Auto VI Vice City Sunset Lucia & Jason"`
   - *Fase 1 a 4:* Exceden 60 chars.
   - *Fase 5:* `Cuadro Vinilico HD Grand Theft Auto VI Vice City` (49 chars) → **Aprobado**.

---

## 2. Estructura de la Planilla Oficial Excel (`Publicar-08-13-09_35_15.xlsx`)

La exportación masiva se realiza sobre el archivo oficial de MercadoLibre respetando la hoja:
`Hogar, Muebles y Jardín > Adornos y Decoración del Hogar > Cuadros, Carteles y Espejos > Cuadros Decorativos`
Nombre de hoja interna: **`Cuadros Decorativos`**.

### Rutas de Plantilla Oficial
1. Primaria: `H:/AuraStudio/Publicar-08-13-09_35_15.xlsx`
2. Secundaria: `H:/Projects/AuraPublisher/public/templates/Publicar-08-13-09_35_15.xlsx`
3. Fallback: Generador programático en memoria `createFallbackMlWorkbook()`.

### Mapeo Completo de 42 Columnas (0 a 41)

| Col | Letra | Nombre de Columna MercadoLibre | Tipo | Obligatorio | Valor por Defecto / Fórmula |
| :---: | :---: | :--- | :---: | :---: | :--- |
| **0** | **A** | `Código de catálogo ML` | String | No | `""` (vacío para publicación estándar) |
| **1** | **B** | `Título` | String | **Sí** | Título SEO optimizado ($\le 60$ caracteres) |
| **2** | **C** | `Cantidad de caracteres` | Fórmula | No | `=LEN(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1))))` |
| **3** | **D** | `Condición` | String | **Sí** | `"Nuevo"` |
| **4** | **E** | `Código universal de producto` | String | **Sí** | `"El producto no tiene código registrado"` |
| **5** | **F** | `Varía por: Nombre comercial del color` | String | **Sí** | `"{Acabado} - {Medida}"` o `"{Diseño} - {Acabado}"` |
| **6** | **G** | `Varía por: Color del armazón` | String | No | `"Escribí o elegí un valor"` |
| **7** | **H** | `Fotos` | String | **Sí** | URLs públicas separadas por espacio (`"https://... https://..."`) |
| **8** | **I** | `SKU` | String | No | `AURA-{CAT}-{ID}-{SIZE}-{FINISH}` |
| **9** | **J** | `Stock` | Number | **Sí** | `99` (o cantidad en inventario) |
| **10** | **K** | `Precio [$]` | Number | **Sí** | Precio final redondeado (Ej: `29900`) |
| **11** | **L** | `Formato de venta` | String | **Sí** | `"Unidad"` (o `"Pack"`) |
| **12** | **M** | `Unidades por pack` | Number | No | `1` |
| **13** | **N** | `Descripción` | Text | No | Copy persuasivo técnico sin HTML ni Markdown |
| **14** | **O** | `Cargo por vender` | Fórmula | No | `=IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="Agregar cuotas",IF(("14.3%")="","-","14.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="No agregar cuotas",IF(("14.3%")="","-","14.3%"),"-"))` |
| **15** | **P** | `Cuotas` | String | **Sí** | `"No agregar cuotas"` |
| **16** | **Q** | `Costo por ofrecer cuotas` | Fórmula | No | `=IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="Agregar cuotas",IF(("12.3%")="","Sin costo","12.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="No agregar cuotas",IF(("")="","Sin costo",""),"-"))` |
| **17** | **R** | `Forma de envío` | String | **Sí** | `"Mercado Envíos"` |
| **18** | **S** | `Costo de envío` | String | **Sí** | Precio $\ge 30000$ ? `"Ofrecés envío gratis"` : `"A cargo del comprador"` |
| **19** | **T** | `Retiro en persona` | String | **Sí** | `"Acepto"` |
| **20** | **U** | `Tipo de garantía` | String | No | `"Garantía del vendedor"` |
| **21** | **V** | `Tiempo de garantía` | Number | No | `30` |
| **22** | **W** | `Unidad de Tiempo de garantía` | String | No | `"días"` |
| **23** | **X** | `Tiempo de disponibilidad del producto` | Number | No | `2` (Días de fabricación artesanal) |
| **24** | **Y** | `Factura A` | String | No | `"No ofrezco"` |
| **25** | **Z** | `Marca` | String | **Sí** | `"AuraStudio"` |
| **26** | **AA** | `Modelo` | String | No | `"Cuadro Decorativo Premium"` / `"Cuadro Resina Epoxi Ultra Gloss"` |
| **27** | **AB** | `Temática del cuadro` | String | No | Temática según categoría (Ej: `"Cine"`, `"Gamer"`, `"Anime"`, `"Música"`) |
| **28** | **AC** | `Altura` | Number | No | Altura en cm (Ej: `70`) |
| **29** | **AD** | `Unidad de Altura` | String | No | `"cm"` |
| **30** | **AE** | `Ancho` | Number | No | Ancho en cm (Ej: `50`) |
| **31** | **AF** | `Unidad de Ancho` | String | No | `"cm"` |
| **32** | **AG** | `Tipo de panel` | String | No | `"Panel único"`, `"Díptico"`, `"Tríptico"`, `"Políptico"` |
| **33** | **AH** | `Marco` | String | No | `"No"` (Bastidor con canto continuo envolvente) |
| **34** | **AI** | `Espesor del marco` | Number | No | `1` (o `2` cm según modelo) |
| **35** | **AJ** | `Unidad de Espesor del marco` | String | No | `"cm"` |
| **36** | **AK** | `Material del marco` | String | No | `"Madera"` |
| **37** | **AL** | `Vidrio` | String | No | `"No"` (Capa de resina o vinilo polimérico) |
| **38** | **AM** | `Frases` | String | No | `"No"` |
| **39** | **AN** | `Resumen de errores` | Fórmula | No | Fórmula oficial de validación de MercadoLibre |
| **40** | **AO** | `BUYBOX_FORMULA` | Fórmula | No | `=IF(OR(TRIM(INDIRECT("B"&ROW()))<>"",TRIM(INDIRECT("A"&ROW()))<>""),AND(TRIM(INDIRECT("A"&ROW()))<>"",TRIM(INDIRECT("D"&ROW()))="nuevo"),"")` |
| **41** | **AP** | `HIDDEN_PICTURES` | String | No | `null` |

---

## 3. Matriz de Variantes y Nomenclatura SKU

Cada publicación puede agrupar múltiples tamaños y acabados dentro de la misma publicación matriz mediante la columna `F` (`Varía por: Nombre comercial del color`).

### Formato Estándar de SKU
```text
AURA-{CATEGORIA}-{ID_TITULO}-{MEDIDA}-{ACABADO}
```
*Ejemplo:* `AURA-PELI-0042-5070-RESB` (Película ID 42, Medida 50x70 cm, Resina Brillante).

### Códigos de Acabado para SKU
- `MAT`: Mate (Vinilo estándar)
- `BRI`: Brillante (Vinilo glossy)
- `HOL`: Holográfico (Tornasolado estelar)
- `RESB`: Resina Brillante (Epoxi vidrio líquido)
- `RESH`: Resina Holográfica (Epoxi tornasolado)

### Dimensiones Estándar del Catálogo

| Proporción | Medida (cm) | SKU Size Code | Uso Recomendado |
| :--- | :--- | :---: | :--- |
| **Cuadrado (1:1)** | $25 \times 25$ | `2525` | Setup Desk, repisas |
| **Cuadrado (1:1)** | $50 \times 50$ | `5050` | Composición modular |
| **Cuadrado (1:1)** | $80 \times 80$ | `8080` | Cuadrado XL de impacto |
| **Vertical (3:4)** | $40 \times 60$ | `4060` | Póster estándar vertical |
| **Vertical (3:4)** | $50 \times 70$ | `5070` | Proporción dorada clásica |
| **Vertical (3:4)** | $70 \times 100$ | `70100` | Living XL pared completa |
| **Horizontal (16:9)**| $60 \times 40$ | `6040` | Dormitorios |
| **Horizontal (16:9)**| $80 \times 45$ | `8045` | Cine panorámico 16:9 |
| **Horizontal (16:9)**| $90 \times 50$ | `9050` | Sobre cabecera / sofá |
| **Horizontal (16:9)**| $100 \times 70$| `10070` | Living panorámico XL |
| **Tríptico (Set 3)** | $120 \times 60$| `TR12060`| 3 paneles de $40 \times 60$ cm |
| **Tríptico (Set 3)** | $150 \times 70$| `TR15070`| 3 paneles de $50 \times 70$ cm |

---

## 4. Cálculo de Precios y Envío Gratis

1. **Precio Final de Variante:**
   $$\text{PrecioFinal} = \text{round}\left(\text{BasePrice}(\text{Size}) \times \text{Multiplier}(\text{Finish}) + \text{Surcharge}(\text{Finish})\right)$$
2. **Multiplicadores y Recargos de Acabado:**
   - **Mate:** Multiplicador $\times 1.0$, Recargo $+\$0$
   - **Brillante:** Multiplicador $\times 1.0$, Recargo $+\$0$
   - **Holográfico:** Multiplicador $\times 1.15$, Recargo $+\$2.500$
   - **Resina Brillante:** Multiplicador $\times 1.45$, Recargo $+\$4.500$
   - **Resina Holográfica:** Multiplicador $\times 1.60$, Recargo $+\$6.000$
3. **Regla de Envío Gratis (Mercado Envíos):**
   - Si $\text{PrecioFinal} \ge \$30.000$ ARS $\rightarrow$ Columna S: `"Ofrecés envío gratis"`
   - Si $\text{PrecioFinal} < \$30.000$ ARS $\rightarrow$ Columna S: `"A cargo del comprador"`

---

## 5. Checklist de Validación Pre-Publicación

- [ ] El título tiene $\le 60$ caracteres.
- [ ] La columna B contiene el título idéntico para todas las filas si son variantes de un mismo producto.
- [ ] La columna F diferencia cada variante de forma unívoca (`"Resina Brillante - 50x70 cm"`).
- [ ] Las fórmulas de las columnas `C`, `O`, `Q`, `AN`, `AO` están intactas sin sobrescritura de texto estático.
- [ ] Las fotos en columna `H` apuntan a URLs HTTPS válidas y accesibles en formato JPG/WEBP $1920 \times 1920$ px.
- [ ] Las filas vacías de la plantilla han sido depuradas (`cleanUnusedRows = true`).
