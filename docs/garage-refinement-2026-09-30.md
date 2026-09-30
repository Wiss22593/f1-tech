# Refinamiento del Garage — 30/09/2026

Trabajo realizado sobre `dev`, HEAD inicial `cdd7e09a54361a82c87fb30dfcf730fb901b060b`. Antes de editar se revisaron status y diff: árbol limpio, sin stash listado. La implementación previa estaba incorporada en ese commit y se conservó.

1. **Archivos modificados:** `src/features/garage/GaragePage.tsx`, `src/i18n/index.ts` y `src/styles/garage.css`. Archivos nuevos: `src/features/garage/presentation.mjs` y `.d.mts`, `src/i18n/remaining-grand-prix.mjs` y `.d.mts`, `tests/garage-presentation.test.mjs` y este reporte. Los scripts, JSON de QA y capturas están en `ingestion/output/`, directorio ignorado.

2. **Subtítulo duplicado:** `showComponentSubtitle` compara los dos textos ya localizados con normalización Unicode NFC, trim, espacios repetidos reducidos y minúsculas. Sólo oculta el subtítulo cuando coincide con el título mostrado. No modifica registros ni traducciones técnicas. También evita repetir el título de una fila textual. En móvil ya se presenta una sola cabecera.

3. **GP traducidos:** catálogo complementario de presentación para Bahréin, Arabia Saudita, Singapur, Estados Unidos, Ciudad de México, São Paulo, Las Vegas, Qatar y Abu Dabi. Incluye los seis idiomas existentes y toma el año del ID. Los labels anteriores y su fallback se conservan. El evento en Sepang mantiene `bahrain-2026` y sus datos internos; en ES se presenta como `GRAN PREMIO DE BAHRÉIN 2026`.

4. **Regla enable/disable:** se carga cada evento mediante el servicio existente de datasets publicados, que valida schema, año, ID y todas las filas `published`. Un evento se habilita sólo si el dataset aceptado contiene al menos una fila factual publicada para ese GP, con o sin hotspot. El estado del calendario, haber corrido la carrera o su fecha futura no determina la disponibilidad. Actualmente hay 15 GP habilitados y 9 deshabilitados. Todos permanecen visibles; las opciones sin datos usan `disabled` real y gris `#888` sobre blanco en desktop. Se mantiene el control nativo móvil.

5. **URL no disponible:** un GP solicitado sin datos cae al último GP publicado de su temporada, ordenado por las fechas resueltas del dataset, y la URL queda normalizada. Azerbaiyán es el resultado actual, sin hardcode. Australia y otros enlaces históricos con datos se mantienen. Una temporada sin publicaciones conserva todas las carreras deshabilitadas y un placeholder; elimina el GP inválido de la URL. No agrega parámetros ni rutas.

6. **Desktop:** se conserva el orden de los once equipos y una fila horizontal. Botones de 72 px dentro de la barra existente de 82 px, fondo sutilmente elevado, borde discreto, barra vertical por equipo, hover breve y estado seleccionado con borde, contraste y línea superior. Sin glow nuevo. Equipos con cero actualizaciones siguen habilitados.

7. **Mobile:** se conservan dos filas y las abreviaturas existentes. Cada botón muestra abreviatura, número destacado y unidad localizada. Se aumenta la barra a 122 px para alojar el contador, manteniendo intacta la altura del canvas del coche (472,625 px en 390×844). No hay overflow horizontal; la página puede desplazarse verticalmente.

8. **Tipografía:** reutiliza Manrope y DM Mono existentes; pesos y espaciados distintos según equipo, estilo dinámico para Red Bull, técnico para Williams y Georgia del sistema para Cadillac. No se agregaron familias descargadas. El diseño permanece coherente y no reproduce wordmarks.

9. **Fuentes propietarias de equipos:** no se incorporaron ni descargaron fuentes oficiales, archivos tipográficos, logos ni wordmarks de escuderías. Georgia es una referencia de fuente del sistema, sin distribución de archivos.

10. **Jerarquía del contador:** número blanco de 23,2 px en desktop y 17,6 px en móvil, dígitos tabulares y posición uniforme para comparación. Unidad debajo del número; cero se muestra como `SIN ACTUALIZACIONES`. Conserva el formatter localizado existente y 1/N sin ceros iniciales. Los botones tienen nombre accesible con equipo y cantidad completa, `aria-pressed` y foco visible; selección reconocible además del color.

11. **QA desktop:** 1366×768 y 1440×900 en Edge headless. Azerbaiyán, Audi y McLaren; duplicado de suspensión delantera eliminado en ES/EN, detalle distinto de pontones retenido; etiquetas y disponibilidad de todos los GP contrastadas con los datasets reales; fallback de URL, reload y GP históricos; cantidades 0/1/8; selección de equipo sin actualizaciones; sin overflow. Canvas de 699 px y 831 px respectivamente, igual que antes.

12. **QA mobile:** 390×844 en Edge headless con viewport móvil. Año y GP en una fila, dos filas de equipos, contadores visibles, selección activa inequívoca, opciones disabled reales, sin overflow horizontal, coche con canvas preservado. También se verificaron reload, enlace histórico y fallback. Es una prueba de viewport; no sustituye una prueba en teléfono físico.

13. **Tests:** 105 tests pasan, 0 fallan y 0 omitidos. Ocho tests nuevos agrupan los diez casos solicitados: coincidencia y diferencia de títulos; disponibilidad factual; URL y latest published; incorporación automática de publicación posterior; traducciones; cero/singular/plural; conteo de filas sin hotspot; datasets reales de Azerbaiyán/Madrid. QA adicional simula respuestas 404 para una temporada vacía sin escribir datasets y verifica que todas las opciones reales queden deshabilitadas.

14. **Lint:** `npm run lint` pasa.

15. **Build:** `npm run build` pasa. Conserva el aviso existente de tamaño del chunk Garage (>500 kB). Sin dependencias nuevas.

16. **Diff-check:** `git diff --check` pasa. Los avisos locales de conversión LF/CRLF no son errores de whitespace.

17. **Component Focus intacto:** ningún archivo de `src/three`, GLB, mapping, shader o material modificado. Se conserva exactamente la integración y cámara del ModelViewer. QA WebGL: piezas reales en BGRT, ningún highlight falso en pontones y filas textuales, cambio pieza/equipo/GP y cierre con restauración; Alpine azul/rosa y alerones/piso intactos; sin pointLight de selección ni allocations acumuladas. Tests de Focus pasan.

18. **FIA/datasets intactos:** diff vacío en `ingestion`, `.github`, `public`, `data`, `src/three`, `src/services`, `src/domain` y `netlify.toml`. No se modificaron sourceText, sourceUrl, IDs, FIA mapping/index, horarios FP1, watch window, calendar resolver, automatización o datasets. La nueva selección publicada pertenece exclusivamente a la presentación del Garage.

19. **No commit:** no se creó ningún commit; HEAD permanece igual al precheck.

20. **No push:** no se ejecutó push.

21. **No deploy:** no se desplegó ni se disparó ningún workflow remoto.

Evidencias locales: `ingestion/output/garage-refinement-browser-qa.json`, `component-focus-v2-browser-qa.json` y capturas `garage-refinement-*.png`.
