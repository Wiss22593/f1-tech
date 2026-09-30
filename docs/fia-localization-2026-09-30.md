# Localización de contenido técnico FIA — 2026-09-30

Implementado en la rama `dev`, sin commit, push ni deploy.

## Causa y arquitectura anterior

El parser y el publicador conservan la fuente FIA en inglés, con `translations: {}`. Ese campo existente es un mapa de cadenas, no un contrato de traducción por las cuatro columnas técnicas, y ninguna vista lo utilizaba para traducirlas.

Madrid tenía un mapa `spanishMadridUpdates` con sus diez traducciones completas dentro de `src/features/garage/data.ts`. También había un mapa de descripciones abreviadas de Monza. Ambos estaban limitados al Garage y ligados a IDs concretos. Azerbaiyán no tenía entradas. Technical Preview, Actualizaciones y Team Detail mostraban directamente los campos originales o `sourceText`.

## Arquitectura aplicada

Una sola capa de presentación, `src/services/fia/localization.mjs`, sirve a todas las vistas. `src/data/fia-localization/es.json` contiene traducciones revisadas por ID, con un `sourceKey` que vincula cada traducción al hash del documento y al texto original. Si cambia el texto, esa traducción de registro no se aplica por el solo hecho de conservar el ID. `terms-es.json` aporta términos técnicos compartidos.

La capa devuelve un objeto nuevo y nunca escribe sobre el registro. Garage conserva una referencia al registro original (`fiaRecord`) y localiza al renderizar; no incorpora el idioma a la descarga. Los filtros de componente de Actualizaciones conservan su valor original aunque cambie la etiqueta visible. Team Detail conserva exactamente su bloque `sourceText` en los idiomas distintos de ES.

Las traducciones de Madrid se trasladaron al catálogo común. Se eliminan los mapas exclusivos del Garage para registros publicados. El pequeño mapa existente de cambios geométricos de los ejemplos DEMO sigue separado de los datos publicados.

Cobertura actual: **218 registros publicados en 15 datasets**. Azerbaiyán: **38/38**, con los cuatro campos traducidos. Madrid: **10/10**. Los **170 históricos con contrato antiguo** carecen de las cuatro columnas separadas: se traduce íntegramente su descripción/bloque original y el nombre del componente disponible. No se reconstruyen columnas ausentes ni se reparan frases truncadas o fragmentos de filas mezcladas en el texto histórico. La traducción conserva esas limitaciones de origen sin inventar información.

ES muestra la presentación española. EN conserva literalmente los cuatro campos originales disponibles y los bloques ingleses que cada página mostraba. IT/PT/FR/DE conservan el fallback inglés existente. Development Battle y Development Ranking usan cantidades, sin exponer texto técnico; no requieren cambios.

En móvil, el componente aparece en el encabezado y el detalle ES muestra también motivo, diferencia geométrica y descripción completa. Se mantiene el contenido móvil anterior en EN y en los demás idiomas.

## Azerbaiyán y Madrid

| Equipo | Azerbaiyán, filas verificadas en ES y EN |
| --- | ---: |
| McLaren | 8 |
| Red Bull Racing | 5 |
| Williams | 5 |
| Racing Bulls | 3 |
| Audi | 14 |
| Cadillac | 3 |
| Total | 38 |

Los ocho registros de Azerbaiyán sin hotspot también tienen traducción completa. Siguen con `componentId: null` y `visualizable: false`.

Madrid conserva diez filas published; Mercedes tres y Red Bull Racing dos. Ambos equipos se verificaron en navegador en ES y EN, además de comprobar por tests todas las traducciones de Madrid.

## Tres ejemplos completos EN → ES

Estos ejemplos reproducen los campos originales y su presentación española, sin resumir las descripciones.

### mclaren — azerbaijan-2026-doc-11-mclaren-sidepods-1

**Componente**

EN: Sidepod Inlet

ES: Entrada del pontón

**Motivo principal**

EN: Performance - Flow Conditioning

ES: Rendimiento - Acondicionamiento del flujo

**Diferencia geométrica**

EN: Revised Sidepod Inlet Shape

ES: Forma revisada de la entrada del pontón

**Descripción**

EN: The sidepod inlet has been revised aiming at improved flow conditioning towards the rear of the car for improved aerodynamic performance.

ES: La entrada del pontón ha sido revisada con el objetivo de mejorar el acondicionamiento del flujo hacia la parte trasera del coche y, con ello, el rendimiento aerodinámico.


### williams — azerbaijan-2026-doc-11-williams-floor-1

**Componente**

EN: Floor

ES: Piso

**Motivo principal**

EN: Performance - Local Load

ES: Rendimiento - Carga aerodinámica local

**Diferencia geométrica**

EN: An updated Floor Bodywork Assembly has been introduced, including new Floor Leading Edge devices, Floor Body and Floor Corner geometry.

ES: Se ha introducido un conjunto de carrocería del piso actualizado, con nuevos elementos del borde de ataque y nuevas geometrías del cuerpo y de la esquina del piso.

**Descripción**

EN: We have modified the forward and outboard regions of the floor to extract more performance both locally and across the main underfloor surfaces.

ES: Hemos modificado las zonas delanteras y exteriores del piso para obtener más rendimiento tanto localmente como en las superficies principales de la parte inferior del piso.


### cadillac — azerbaijan-2026-doc-11-cadillac-front-corner-1

**Componente**

EN: Front Corner

ES: Conjunto delantero

**Motivo principal**

EN: Performance – Brake Cooling

ES: Rendimiento - Refrigeración de los frenos

**Diferencia geométrica**

EN: Updated brake cooling inlet and exit duct profiles

ES: Perfiles actualizados de los conductos de entrada y salida de refrigeración de los frenos

**Descripción**

EN: The front corner geometry has been revised to increase the available brake cooling capacity, whilst maintaining flow quality to the rear of the car

ES: Se ha revisado la geometría del conjunto delantero para aumentar la capacidad de refrigeración disponible para los frenos, manteniendo la calidad del flujo hacia la parte trasera del coche.

## Futuras publicaciones: Sepang / Bahrain

Se auditó el parser, el publicador y `.github/workflows/fia-auto-publish.yml`. El pipeline actual descubre, extrae, valida y publica datos originales EN; **no contiene traducción automática**. Su allowlist permite publicar solamente datasets. No se modificó el pipeline ni su allowlist.

La UI aplica la misma capa a los nuevos registros. Puede reutilizar términos o frases completas cuyo texto inglés coincide exactamente con una traducción ya revisada, por campo. Esto es memoria de traducción: no traduce una frase nueva, no hace sustituciones parciales ni deduce objetivos técnicos. Una frase desconocida muestra **“Traducción al español pendiente.”** en ES; el original completo sigue disponible en EN. El localizador informa `complete: false` y `missingFields` para detectar qué falta revisar.

Para que una futura descripción nueva aparezca íntegramente en ES, hace falta incorporar una traducción revisada al catálogo de presentación y publicar esa revisión de la aplicación. No se promete que una publicación automática de Sepang/Bahrain vaya a traducir por sí sola descripciones novedosas.

Procedimiento para mantener el catálogo:

1. Leer el registro EN publicado y su documento FIA, sin editar ninguno de sus originales.
2. Traducir los cuatro campos existentes con revisión técnica; si el contrato histórico no separa campos, conservar el bloque completo y los campos ausentes como `null`.
3. Agregar una entrada con el ID original, `sourceKey: fiaLocalizationSourceKey(record)` y `es: { componentName, primaryReason, geometricDifference, briefDescription }` en `src/data/fia-localization/es.json`.
4. Ejecutar los tests y verificar ES/EN en las vistas. Los tests comprueban las entradas revisadas y el baseline actual; no exigen un catálogo completo para un dataset futuro desconocido, por lo que no bloquean la autopublicación de un nuevo GP por carecer de traducción.

Una automatización real de traducción futura necesitaría un productor de traducciones técnicamente revisadas, validación de fidelidad y un paso autorizado de publicación del catálogo de aplicación. No se agregó API paga, servicio externo, credencial ni secreto.

## Validaciones

- `npm run lint`: OK.
- `npm test`: 61 tests aprobados, incluyendo 12 tests nuevos de localización.
- `npm run build`: OK; Vite mantiene su advertencia de tamaño del chunk del Garage.
- `git diff --check`: OK.
- Los 15 datasets públicos se compararon contra `HEAD` y son idénticos tras normalizar CRLF/LF; se agregaron hashes de regresión para ese baseline. No se modificó ningún archivo de datos FIA.
- Tests: cobertura de traducciones, originales EN, fallback de cuatro idiomas, ES → EN → ES, ausencia de mutaciones, conteos, Madrid, filas sin hotspot, contrato histórico, reutilización de frases exactas y rechazo de traducciones obsoletas ante texto nuevo.
- Navegador Edge con build local: los 38 registros de los seis equipos se compararon campo por campo contra ES y EN en Garage. Los cambios de idioma conservaron GP, equipo y URL y no provocaron solicitudes adicionales de datasets.
- Reload en ES y cambio Madrid → Azerbaiyán: OK.
- Technical Preview y Actualizaciones: 218 filas; las 38 de Azerbaiyán verificadas en los seis idiomas, sin refetch por cambio de idioma.
- Team Detail: historial de McLaren ES → EN → ES, comprobando que EN conserva `sourceText` literalmente.
- Móvil, 390px: componente, motivo, diferencia geométrica y descripción en ES; inspección visual desktop y móvil.
- Sin errores de JavaScript en las pruebas de navegador.

Se mantienen intactos `sourceText`, `sourceUrl`, cuatro campos originales, IDs, hashes, publication state, componentId, visualizable y cantidad de filas. No se tocaron Alpine GLB, BGRT, shaders, materiales, cámaras, hotspots, colores, selector GP, workflow FIA, Netlify ni branding.

## Archivos modificados o agregados

- `src/data/fia-localization/es.json`: catálogo revisado de 218 registros.
- `src/data/fia-localization/terms-es.json`: términos compartidos para coincidencias exactas.
- `src/services/fia/localization.mjs`: capa única de presentación y memoria de traducción.
- `src/services/fia/localization.d.mts`: contrato tipado para las vistas TypeScript.
- `src/features/garage/data.ts`: adaptación al localizador y migración de mapas publicados.
- `src/features/garage/GaragePage.tsx`: referencia al registro original y detalle móvil ES completo.
- `src/features/technical-preview/TechnicalPreview.tsx`: presentación compartida.
- `src/features/updates/UpdatesPage.tsx`: presentación compartida y filtros estables entre idiomas.
- `src/components/teams/TeamDetail.tsx`: presentación compartida conservando el bloque EN original.
- `tests/fia-ingestion.test.mjs`: ajuste de la regresión arquitectónica de Madrid al localizador común.
- `tests/fia-localization.test.mjs`: 12 pruebas de alto valor.
- `tests/fixtures/published-localization-dataset-hashes.json`: hashes de los 15 datasets intactos.
- `docs/fia-localization-2026-09-30.md`: este reporte, ejemplos y mantenimiento futuro.

No commit. No push. No deploy.
