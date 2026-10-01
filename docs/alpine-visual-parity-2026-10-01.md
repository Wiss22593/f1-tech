# Alpine: auditoría de paridad visual Blender ↔ Formula Tech

Fecha: 2026-10-01. Rama: `dev`. Revisión auditada: `3a6a10a478ff9ca814352e3f928384bc735e10a0`.

## Resultado

**Formula Tech conserva los parámetros PBR exportados del Alpine.** La carga original del GLB y todos los materiales clonados del showroom coinciden en runtime, incluidos mapas y transformaciones. Component Focus tampoco modifica esos parámetros: atenúa temporalmente el resultado del shader y vuelve a ganancia 1 al restablecer.

La explicación principal compatible con la evidencia es **una iluminación/environment y una transformación de imagen diferentes entre las dos aplicaciones**. El showroom usa un estudio propio y ACES. Cambiar únicamente ACES por AgX en el diagnóstico modifica claramente saturación y contraste sin modificar materiales. No se encontró un error de conversión de color ni un override de Alpine.

**El GLB actual no contiene `KHR_materials_clearcoat`.** No hay barniz exportado que Three.js pueda recuperar. Esto no demuestra por sí solo una pérdida durante la exportación: podría estar desactivado en Blender. Si el material original tiene Coat Weight mayor que cero, hay que investigar esa diferencia en el proyecto/exportador.

No se dispone del `.blend`, del HDRI, del modo de visualización, del View Transform ni de la exposición de Blender. La atribución exacta de la diferencia Blender ↔ web queda sin confirmar. Se verificó el tramo GLB → runtime y se aislaron causas posibles mediante renders controlados; no se comparó contra un render original de Blender.

**No se cambió código de producción, el GLB ni la apariencia del showroom. No hubo commit ni push.**

## 1. Renderer y presentación

Configuración observada en la aplicación compilada, con Alpine seleccionado y sin componente activo:

| Parámetro | Valor actual |
| --- | --- |
| Three.js | r174 / `0.174.0` |
| Loader de `useGLTF` | `three-stdlib` `2.36.1`, `GLTFLoader` |
| `outputColorSpace` | `SRGBColorSpace` (`"srgb"`) |
| Espacio de trabajo | Linear-sRGB (`"srgb-linear"`) |
| `ColorManagement.enabled` | `true` |
| `toneMapping` | `ACESFilmicToneMapping` (4) |
| `toneMappingExposure` | `0.96` |
| `physicallyCorrectLights` / `useLegacyLights` | Ninguna propiedad existe en esta versión; usa el camino actual de iluminación física de Three.js |
| Sombras | Activadas, `PCFSoftShadowMap` (2) |
| DPR | Configurado entre 1 y 1.5; observado 1 en QA |
| Fondo | `#07080b` |
| Postprocessing | Sin composer, bloom, SSAO, LUT ni corrección adicional |
| Filtro CSS del canvas | `none` |

La conversión de salida y el tone mapping se realizan en el shader de Three.js. El gain de Component Focus se aplica después de esos pasos.

`0.96` es un multiplicador, no una exposición de Blender en EV: aproximadamente −0.059 stops frente a 1. La implementación ACES de r174 incluye su propia escala (`exposure / 0.6`); igualar el número de exposición entre aplicaciones no garantiza la misma imagen.

Fuente: `src/three/ModelViewer.tsx:155`. Se comprobaron valores efectivos en runtime y las implementaciones instaladas de R3F/Three.js, además del código de la aplicación.

## 2. Luces actuales

| Luz | Color sRGB | Intensidad | Posición | Sombras |
| --- | --- | --- | --- | --- |
| Ambient | `#ffffff` | 0.20 | No direccional | No |
| Hemisphere | Cielo `#91a4bb`, suelo `#090a0d` | 0.48 | `[0, 1, 0]` | No |
| Directional principal | `#fff6eb` | 2.80 | `[4.5, 7, 5]` | Sí |
| Directional relleno | `#a8c8ef` | 0.70 | `[-5, 2.5, 3]` | No |
| Directional contraluz | `#d5e0f0` | 1.25 | `[2.5, 4, -5]` | No |

Las direccionales apuntan al origen. La principal tiene mapa 2048 × 2048, radio 8 y bias −0.0001. No hay luces point ni spot.

El suelo está en Y = −0.3, con color `#121419`, roughness 0.82, metalness 0.10 y recibe sombras. Afecta la composición visible; no se añadió como reflejo dinámico al environment.

## 3. Environment actual

`Environment` de Drei captura cuatro `Lightformer` en una cubemap de 128 píxeles por cara, tipo HalfFloat. No carga un HDRI externo ni uno procedente de Blender.

| Panel | Color | Intensidad | Posición | Escala |
| --- | --- | --- | --- | --- |
| Superior | `#f6f8fc` | 2.60 | `[0, 6, 4]` | `[9, 4, 1]` |
| Lateral | `#b8d6f4` | 1.15 | `[-5, 2, 2]` | `[4, 2, 1]` |
| Trasero | `#e9edf4` | 1.75 | `[3, 3, -5]` | `[5, 2, 1]` |
| Inferior | `#c2cfdf` | 2.60 | `[0, -3, 0]` | `[12, 9, 1]` |

Paneles: `MeshBasicMaterial`, DoubleSide, `toneMapped=false`, color lineal multiplicado por intensidad. El inferior tiene rotación X = π/2; los restantes miran al origen. La captura alimenta iluminación indirecta/reflejos con filtrado PMREM.

Runtime: CubeTexture, `CubeReflectionMapping`, `scene.environmentIntensity=1`, rotación `[0, 0, 0]`. Environment usa `background=false`; el fondo oscuro es independiente de los reflejos. La etiqueta `colorSpace=""` del render target corresponde a NoColorSpace: sus píxeles provienen del render lineal de los paneles, no de una imagen sRGB sin decodificar.

Matiz de r174: cuando Standard/Physical tiene `envMap=null` y usa `scene.environment`, el uniform efectivo de intensidad se obtiene de `scene.environmentIntensity`. Alpine tiene tanto propiedad de material como uniform efectivo en **1**. No hay que asumir un segundo multiplicador de environment a partir de la propiedad del material.

## 4. Material Blender / GLB / runtime

Asset: `public/models/alpine-a526-formulatech.glb`.

SHA-256: `6d1f8f5680ab4c627fb8e4b82fc089c5fe047ccb0c45961c3673d394c9a9fd03`.

El encabezado declara glTF 2.0 y generador `Khronos glTF Blender I/O v5.2.40`. Identifica el exportador; no prueba la configuración original de Blender.

Extensiones usadas: `KHR_materials_specular`, `KHR_texture_transform`. Requerida: `KHR_texture_transform`. No hay `KHR_materials_clearcoat`, `KHR_materials_ior` ni `KHR_lights_punctual`.

| Propiedad | `livery` azul | `Alpine Pink` |
| --- | --- | --- |
| Base color lineal en GLB y runtime | `[0.0005266601, 0.0525606647, 0.4909910262]` | `[0.7912982106, 0, 0.2086369097]` |
| Color sRGB / hex runtime | `[0.0068044488, 0.2541740315, 0.7293956326]` / **`#0241ba`** | `[0.9019624139, 0, 0.4941234275]` / **`#e6007e`** |
| Tipo runtime | `MeshPhysicalMaterial` | `MeshStandardMaterial` |
| Metalness GLB / runtime | 0 / 0 | 0 / 0 |
| Roughness GLB / runtime | 0.2800000012 / 0.2800000012 | 0.3000000119 / 0.3000000119 |
| Clearcoat en GLB | Ausente | Ausente |
| Clearcoat runtime | 0 | Propiedad inexistente; sin capa coat |
| Clearcoat roughness runtime | 0, default Physical | Propiedad inexistente |
| IOR en GLB | Extensión ausente | Extensión ausente |
| IOR runtime | 1.5, default Physical | Sin propiedad expuesta; BRDF dieléctrico Standard con F0 = 0.04 |
| `envMapIntensity` runtime | 1 | 1 |
| Opacity / transparent | 1 / false | 1 / false |
| Emissive / emissiveIntensity | Negro / 1 | Negro / 1 |
| Mapas de pintura, normales, PBR y coat | Ninguno | Ninguno |
| Double sided / vertex colors | Sí / no | Sí / no |

Los hex representan el **base color**, no un píxel iluminado. Los factores del GLB ya son lineales: no se les aplica una segunda decodificación sRGB. Las texturas de color de otros materiales se cargan con sRGB y sus normales/roughness con NoColorSpace, conforme al [pipeline de Three.js](https://threejs.org/manual/pages/color-management.html).

El azul lleva `KHR_materials_specular.specularColorFactor=[1.1200000048, 1.1200000048, 1.1200000048]`, conservado con specularIntensity 1. Esa extensión explica que sea Physical. **Physical no implica barniz activo.** Pink usa defaults Standard. `specularColorFactor` puede superar 1 según el [schema de Khronos](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_materials_specular/schema/material.KHR_materials_specular.schema.json); no se detectó una exportación inválida por ese valor.

### Clearcoat

No existe una capa clearcoat en este archivo. No se puede afirmar que un barniz definido en Blender haya llegado al navegador. Sí se verificó que **el mismo loader de la aplicación soporta la extensión**: una fixture independiente con factor 1 y roughness 0.15 llega como Physical con 1 y 0.15, e IOR 1.5. La fixture no reemplazó ni modificó Alpine.

La [especificación de Khronos](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_clearcoat/README.md) define clearcoat como una capa adicional. El [exportador de Blender](https://docs.blender.org/manual/sr/4.5/addons/import_export/scene_gltf2.html) exporta los inputs compatibles de Coat mediante esa extensión cuando corresponde. Si se espera barniz, hay que comprobar Coat Weight, conexiones de nodos y exportación en el proyecto original.

## 5. Overrides y Component Focus

`src/three/assets.ts:17` registra Alpine con `liveryMode: 'authored'`. `useGLTF` carga el archivo; escena y materiales se clonan para preservar objetos cacheados.

En `src/three/ModelViewer.tsx:52`, los overrides están limitados a `liveryMode === 'team-theme'` y `livery`. Ese bloque elimina el mapa de color, cambia color/roughness/metalness/envMapIntensity/emissive/emissiveIntensity y añade franjas mediante shader. **No se ejecuta para Alpine.** No se encontró otro override normal de color, clearcoat, clearcoatRoughness u opacity en su camino.

`src/three/component-isolation.mjs` modifica grupos de geometría y añade `f1TechIsolationGain` al final del fragment shader. Sin selección, todas las ganancias son 1. Durante Focus, el componente conserva 1 y el resto llega a 0.28, con transición de 280 ms. Oscurece el resultado visible, sin escribir parámetros PBR. Restablecer devuelve la ganancia a 1. La iluminación inferior pertenece al showroom general, no es un override de material durante Focus.

Prueba runtime: normal → Halo seleccionado → restablecido mantiene idénticos colores, metalness, roughness, emisivo, coat, IOR, opacidad y texturas. Todos los materiales clonados coinciden también con una carga nueva del GLB mediante el mismo loader.

## 6. Comparación controlada

Laboratorio temporal: `ingestion/output/alpine-parity-lab.html`, fuera del código y de la entrada de producción. No se añadió un modo al showroom público. Carga directamente materiales originales y no contiene Component Focus.

Los cuatro renders del laboratorio mantienen GLB, cámara, escala, geometría, suelo, DPR y exposición. Se verificó invariancia de propiedades y texturas entre modos.

| Comparación | Cambio controlado | Observación |
| --- | --- | --- |
| A. Showroom | Reproduce luces/environment actuales, ACES 0.96 | Azul/rosa saturados y reflejos fríos, consistente con la aplicación |
| B. Estudio neutro | Fondo `#101114`, luces/paneles blancos, hemi blanco arriba/abajo; ACES 0.96 | Cambian reflejos y claridad de superficies oscuras; azul/rosa siguen intensos |
| C. Neutro + AgX | Igual a B, cambiando solamente ACES por AgX de Three.js | Cambian marcadamente saturación/contraste; azul/rosa más suaves |
| D. Neutro + Linear | Igual a B, cambiando solamente tone mapping | Rosa más intenso y otra respuesta de reflejos |

El neutro mantiene disposición e intensidades del estudio para aislar su tinte; no reproduce el HDRI de Blender. AgX de Three.js tampoco demuestra equivalencia exacta con Blender. Las transformaciones cambian cómo valores de escena se presentan en pantalla, según la [documentación de Blender](https://docs.blender.org/manual/en/5.1/render/color_management/displays_views.html).

Capturas:

- [Aplicación actual](../ingestion/output/alpine-parity-showroom-app.png).
- [A. Showroom sin UI ni isolation](../ingestion/output/alpine-parity-showroom-raw.png).
- [B. Neutro / ACES](../ingestion/output/alpine-parity-neutral-raw.png).
- [C. Neutro / AgX](../ingestion/output/alpine-parity-agx-raw.png).
- [D. Neutro / Linear](../ingestion/output/alpine-parity-linear-raw.png).

La captura de aplicación incluye UI superpuesta. A–D son canvas puros comparables entre sí. La reproducción del showroom sirve como control visual; no se afirma identidad de cada píxel con la aplicación.

## 7. Diagnóstico por causa

| Causa | Resultado |
| --- | --- |
| A. Material exportado | Factores color/PBR/specular conservados desde GLB. Clearcoat ausente. Falta contrastar con `.blend` si allí hay coat u otro nodo no exportado. |
| B. Modificación runtime | Descartada para parámetros PBR auditados en normal y Focus/restablecer. |
| C. Lighting | Influye: luces coloreadas, varias fuentes y sombras propias. Luces Blender desconocidas. |
| D. Environment | Influye: cuatro paneles generados, incluido el inferior; sin HDRI común confirmado. |
| E. Tone mapping | Influencia fuerte demostrada ACES ↔ AgX con materiales/luces constantes. View Transform Blender desconocido. |
| F. Exposure | Influye; 0.96 cercano a 1. Sin EV Blender no se puede cuantificar su contribución relativa. |
| G. Color space | Sin error encontrado: factores lineales, mapas clasificados correctamente, salida sRGB. |

**Prioridad:** confirmar View Transform/EV/HDRI de Blender y si Coat está activo. No corregir azul/rosa para compensar iluminación web.

## 8. Recomendación y archivos potenciales

Conservar showroom y `liveryMode: 'authored'`. Para futuros liveries, fijar una referencia de revisión: HDRI/estudio documentado, cámara, transformación de imagen y exposición. Comparar primero el GLB exportado en esa referencia y después en Formula Tech. Documentar por separado material y perfil de iluminación.

En una futura validación de assets, comparar parámetros GLB → runtime y comprobar `KHR_materials_clearcoat` cuando la ficha declare barniz. Usar Principled BSDF/conexiones compatibles con glTF y verificar extensiones en el archivo exportado. Evitar compensaciones de color por equipo en el renderer.

No hace falta modificar producción para corregir un override de Alpine: no se encontró uno. Si se formaliza el diagnóstico:

- `src/three/ModelViewer.tsx`: separar/documentar el perfil de showroom y añadir un perfil neutro limitado a DEV, preservando el default.
- `src/three/assets.ts`: mantener authored; opcionalmente declarar expectativas de materiales/extensiones por asset.
- Pruebas de assets en `tests/`: proteger valores PBR y ciclo Focus/restablecer. No cambiar `component-isolation.mjs` por esta auditoría.
- Proyecto Blender/configuración de exportación: revisar si se esperaba Coat. Reexportar sólo tras confirmar la diferencia; no activar barniz desde JavaScript como compensación.

## Validación y entregables

- Build de producción: correcto; advertencia existente de tamaño de chunk, sin error.
- QA runtime en Edge/WebGL: sin errores ni warnings de consola; tres comprobaciones de preservación/loader correctas.
- Cuatro renders diagnósticos con invariancia de materiales comprobada; revisión visual de cinco capturas.
- `git diff --check`: correcto al cierre.
- No se ejecutaron lint/tests de aplicación: no se cambió código ejecutable de producción. Sí se ejecutaron las comprobaciones específicas del diagnóstico.

Único archivo nuevo versionable: este informe. Evidencias/laboratorio están en `ingestion/output/`, ignorado por Git:

- [Snapshot runtime completo](../ingestion/output/alpine-parity-runtime.json).
- [Materiales/metadatos GLB](../ingestion/output/alpine-parity-glb.json).
- [Script reproducible QA](../ingestion/output/audit-alpine-parity-browser.mjs).
- [Laboratorio local](../ingestion/output/alpine-parity-lab.html).

Los archivos ignorados permanecen disponibles en este workspace; no forman parte de un futuro commit del informe. Los servidores de QA se cerraron.
