# Informe de implementación · F1 TECH

8 de octubre de 2026. Cambios locales sobre `C:\Users\mb937\Desktop\f1-tech`; sin publicación.

## Resultado

- Mobile hasta 600 px: **☕ Apoyar**. Desktop: **☕ Apoyar Formula Tech** en ES. Mismo destino Cafecito y apertura en otra pestaña; aria-label completo; botón 78,1 × 44 px en mobile ES. El selector ES y el menú informativo miden 44 × 44 px.
- Configuración AdSense **OFF**, sin publisher/slot IDs, loader, peticiones publicitarias, bloques visibles o huecos reservados. Las cuatro ubicaciones secundarias tienen gates de configuración, derechos, aprobación, privacidad, consentimiento real y script disponible. Home no tiene AdSlot.
- Acerca de, Privacidad y Contacto: nuevas rutas, textos reales y pendientes explícitos en los seis idiomas. Menú accesible con enlaces normales y Escape; footer enlazado en secundarias. No se inventó contacto, titular, licencia ni declaración de cumplimiento legal.
- Metadatos iniciales ES, canonical por sección, sitemap y robots con URL absoluta. La SPA sigue dependiendo de JavaScript para el contenido por ruta; no se certifica indexación.

## Espacio real con ES

Mediciones DOM con fuentes cargadas, Edge headless, escala 1. Hueco horizontal entre borde derecho de Formula Tech y borde izquierdo de Apoyar; incluye margen de separación, no es una aprobación de formato publicitario.

| Viewport | Home: hueco | Secundarias: hueco | Header Home | Ancho de contenido móvil |
|---|---:|---:|---:|---:|
| 360 × 800 | 66,8 px | 39,6 px | 59 px | 324 px |
| 390 × 844 | 96,8 px | 69,6 px | 59 px | 354 px |
| 412 × 915 | 118,8 px | 91,6 px | 59 px | 376 px |
| 1280 × 900 | 778,8 px* | 791,1 px* | 68 px | — |
| 1440 × 1000 | 926,0 px* | 938,3 px* | 68 px | — |

*En desktop ese intervalo también contiene separador y navegación: no está íntegramente disponible. En secundarias quedan 688,3 / 835,5 px entre navegación y apoyo a 1280/1440. Un leaderboard 728 × 90 no cabe en el header de 68 px, aunque a 1440 haya ancho. Una unidad 468 × 60 es geométricamente evaluable en desktop con separación suficiente, pero no se insertó junto a controles ni se cambió la altura del Home. Se prefieren las ubicaciones alternativas en flujo normal.

**No cabe una unidad útil en el header móvil.** Incluso el ejemplo móvil 320 × 50 documentado por Google supera ampliamente el hueco de 66–119 px; no se inventó un anuncio de ese ancho, ni se superpuso a marca, menú, ES o apoyo. Se conserva Home fullscreen. Un rectángulo 300 × 250 cabe en el contenido de las secundarias a las tres anchuras probadas; se prepara exclusivamente allí, siempre sujeto a aprobación de contenido/derechos. [Tamaños y código responsive oficial](https://support.google.com/adsense/answer/9183363?hl=es).

## Verificación

- TypeScript: pasó. Lint: pasó. 195 pruebas existentes: pasaron. Nueva prueba de bloqueo publicitario: pasó (cada gate, consentimiento/script runtime, IDs inválidos, placement fuera de lista y ancho insuficiente).
- Cinco tamaños: sin overflow horizontal en Home y siete rutas secundarias/informativas. Home sin scroll global. Cero unidades/script AdSense en DOM y cero solicitudes a googlesyndication, doubleclick, googleadservices o fundingchoices.
- Mobile: carga 3D, apertura de Componentes y selección de pieza verificadas a 360/390/412; no generaron scroll global. Se cambió y restauró el GP durante la matriz responsive; selector ES y controles conservaron su funcionamiento. Las pruebas existentes de scroll a fila/pieza pasaron.
- Menú: links visibles y alcanzables en los cinco tamaños, Escape, y navegación real a Privacidad comprobados. La prueba aislada del menú omite cargar GLB para reducir consumo; las capturas Home/paneles sí usan los modelos originales.
- Se probaron los seis idiomas de Privacidad, aria-label de apoyo y lang del documento.
- Build estándar: **no completado**, falló con ENOSPC al duplicar el ZIP existente de BGRT en dist. TypeScript ya había pasado. Build de Vite sin copiar public: **pasó**, incluye el código/CSS real pero no es un paquete listo para desplegar. No publicar el dist parcial. Warning preexistente de chunks grandes. No se borraron ni modificaron modelos originales para sortear el fallo.
- El servidor dev de prueba tuvo un 403 al pedir una dependencia preoptimizada de Drei; la verificación visual se completó sobre el bundle compilado servido localmente con assets públicos originales en sólo lectura. No se cambió rendering ni se atribuye ese fallo a AdSense.

## Pendientes antes de solicitar / activar

Netlify fue comprobado en lectura: **HTTP 503, usage_exceeded**. Hace falta HTTP 200 con contenido real; la recuperación en dos días no está confirmada. AdSense es gratuito. `netlify.app` consta en PSL y Google admite sitios de esas plataformas: hay fundamento para intentar `formulatech.netlify.app` sin comprar un dominio, sujeto a la interfaz y revisión de Google. Ver la guía para fuentes y pasos.

**Faltan permisos comerciales verificables de modelos/skins/liveries Formula Alpha/VRC, BGRT y otros materiales de terceros.** Compra de un mod, atribución o modificación no prueba permiso para publicación web, redistribución y monetización. También faltan identidad/contacto reales, privacidad definitiva, aprobación, IDs auténticos y CMP/consentimiento aplicables. No activar con esos puntos abiertos. El sitio contiene capas DEMO y necesita suficiente valor editorial original; no se garantiza aceptación ni ingresos.

Se preservaron cambios concurrentes de Work en `GaragePage.tsx` y `showroom.css` (GP móvil y layout), y se conservaron scroll de piezas y estética. Esta tarea no editó esos archivos. Sin cambios a GLB, skins, mapas, datos FIA, workflows, automations, credenciales, GitHub o Netlify. Sin nuevas dependencias ni commit/push/merge/deploy.

Evidencias: responsive-measurements.json, additional-measurements.json, panel-verification.json, menu-verification.json, logs de TypeScript/lint/test de anuncios y capturas. Las mediciones completas indican bounds, texto accesible, idioma y ausencia de ads por ruta.
