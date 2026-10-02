# Auditoría completa FIA 2026

Fuente de verdad: PDFs oficiales FIA Car Presentation Submissions descargados nuevamente el 2 de octubre de 2026. Se revisaron visualmente todas sus páginas; los JSON previos se usaron solamente para comparar el estado anterior.

## Causa raíz

El parser anterior retenía activeTeamId y el perfil de tabla entre páginas. El encabezado de Ferrari en Bahrain está fragmentado en runs PDF (Scu + deria Ferrari HP); el matching sobre texto aplanado lo omitió y heredó Red Bull. En los datasets históricos, la extracción aplanada perdió columnas y filas, e incluyó números del texto como filas. El nuevo parser reconstruye encabezados por coordenadas y acepta únicamente nombres completos reconocidos en la misma página. No hereda equipos ni usa índices globales.

Cada registro conserva las cuatro columnas EN, URL, hash, página, número de fila y encabezado. Las continuaciones sin encabezado quedan automáticamente en manual_review. Las continuaciones publicadas tienen una revisión visual explícita autorizada por el usuario, vinculada al hash del PDF, página del encabezado y hash de las cuatro celdas; el inventario está en data/fia-reviewed-sections/2026.json. Un cambio en esa evidencia invalida la aprobación. Dos continuaciones de celdas (Haas Australia y Red Bull Miami) conservan ambas páginas en sourcePages.

Las traducciones ES reproducen las cuatro celdas completas; no se reutilizan traducciones si cambian el original o su hash. Las filas sin mapping 3D siguen publicadas con componentId=null y visualizable=false.

## Reconciliación

431 filas FIA factuales = 427 publicadas + 4 manual_review. Duplicados finales: 0. Dos filas numeradas vacías (Red Bull Barcelona, página 6, filas 3 y 4) se descartan explícitamente como plantillas sin actualización factual.

Australia: las cuatro filas Williams de la página 10 están rasterizadas y no aparecen en la capa de texto. Se inventariaron mediante inspección visual y se conservan en data/fia-audit/2026-manual-review.json; no se publicaron porque falta validar la transcripción. Los demás GP quedan íntegramente publicados.

Bahrain Doc 12: Ferrari tiene “Diffuser outboard winglet cascade element development”; Red Bull tiene solamente “Floor Board”. Países Bajos Doc 10: Alpine tiene exactamente 8 filas (Floor Body, Floor Board, Floor Edge, Diffuser, Sidepod/Coke, Rear Corner, Rear Impact Structure, Rear Wing); las filas 7 y 8 están en la continuación revisada de la página 17, con encabezado de la página 16. Bahrain mantiene grandPrixId=bahrain-2026 y es el último dataset publicado que Garage selecciona al cargar/reload.

GP | Equipo | Filas FIA | Publicadas | Manual review | Correcciones
--- | --- | ---: | ---: | ---: | ---
Australian Grand Prix | mclaren | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | mercedes | 3 | 3 | 0 | 0 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | red-bull-racing | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | ferrari | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | williams | 4 | 0 | 4 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | racing-bulls | 4 | 4 | 0 | 3 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | aston-martin | 7 | 7 | 0 | 3 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | haas | 7 | 7 | 0 | 0 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 7; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | audi | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | alpine | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Australian Grand Prix | cadillac | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | mclaren | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | mercedes | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | red-bull-racing | 7 | 7 | 0 | 5 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | ferrari | 4 | 4 | 0 | 0 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 1; duplicados previos: 0
Austrian Grand Prix | williams | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | racing-bulls | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | haas | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | audi | 7 | 7 | 0 | 4 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | alpine | 5 | 5 | 0 | 2 → 5 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Austrian Grand Prix | cadillac | 10 | 10 | 0 | 3 → 10 publicadas; reconstrucción desde PDF; sin representación fiel previa: 7; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | mclaren | 8 | 8 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | mercedes | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | red-bull-racing | 5 | 5 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | ferrari | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | williams | 5 | 5 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | racing-bulls | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | haas | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | audi | 14 | 14 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 7; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | alpine | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Azerbaijan Grand Prix | cadillac | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | mclaren | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | mercedes | 7 | 7 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | red-bull-racing | 1 | 1 | 0 | 2 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | ferrari | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 1; duplicados previos: 0
Bahrain Grand Prix | williams | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | racing-bulls | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | haas | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | alpine | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Bahrain Grand Prix | cadillac | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | mclaren | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | mercedes | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | red-bull-racing | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | ferrari | 8 | 8 | 0 | 1 → 8 publicadas; reconstrucción desde PDF; sin representación fiel previa: 7; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | williams | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | racing-bulls | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | haas | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | alpine | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Barcelona-Catalunya Grand Prix | cadillac | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | mclaren | 2 | 2 | 0 | 0 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | mercedes | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | red-bull-racing | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | ferrari | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | williams | 3 | 3 | 0 | 0 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | racing-bulls | 4 | 4 | 0 | 2 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | haas | 4 | 4 | 0 | 0 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | audi | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | alpine | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Belgian Grand Prix | cadillac | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | mclaren | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | mercedes | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | red-bull-racing | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | ferrari | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | williams | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | racing-bulls | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | haas | 2 | 2 | 0 | 0 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | alpine | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
British Grand Prix | cadillac | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | mclaren | 7 | 7 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | mercedes | 8 | 8 | 0 | 0 → 8 publicadas; reconstrucción desde PDF; sin representación fiel previa: 8; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | red-bull-racing | 4 | 4 | 0 | 3 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | ferrari | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | williams | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | racing-bulls | 4 | 4 | 0 | 1 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | haas | 5 | 5 | 0 | 0 → 5 publicadas; reconstrucción desde PDF; sin representación fiel previa: 5; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | audi | 4 | 4 | 0 | 2 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | alpine | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Canadian Grand Prix | cadillac | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | mclaren | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | mercedes | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | red-bull-racing | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | ferrari | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | williams | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | racing-bulls | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | haas | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | audi | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | alpine | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Chinese Grand Prix | cadillac | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | mclaren | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | mercedes | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | red-bull-racing | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | ferrari | 5 | 5 | 0 | 0 → 5 publicadas; reconstrucción desde PDF; sin representación fiel previa: 5; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | williams | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | racing-bulls | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | aston-martin | 5 | 5 | 0 | 2 → 5 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | haas | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | alpine | 8 | 8 | 0 | 3 → 8 publicadas; reconstrucción desde PDF; sin representación fiel previa: 5; atribuciones erróneas identificadas: 0; duplicados previos: 0
Dutch Grand Prix | cadillac | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | mclaren | 5 | 5 | 0 | 2 → 5 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | mercedes | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | red-bull-racing | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | ferrari | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | williams | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | racing-bulls | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | aston-martin | 16 | 16 | 0 | 6 → 16 publicadas; reconstrucción desde PDF; sin representación fiel previa: 13; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | haas | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | audi | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | alpine | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Hungarian Grand Prix | cadillac | 1 | 1 | 0 | 0 → 1 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | mclaren | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | mercedes | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | red-bull-racing | 4 | 4 | 0 | 2 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | ferrari | 4 | 4 | 0 | 1 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | williams | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | racing-bulls | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | aston-martin | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | haas | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | alpine | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Italian Grand Prix | cadillac | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | mclaren | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | mercedes | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | red-bull-racing | 4 | 4 | 0 | 2 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | ferrari | 2 | 2 | 0 | 0 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | williams | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | racing-bulls | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | aston-martin | 3 | 3 | 0 | 1 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | haas | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | alpine | 3 | 3 | 0 | 0 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Japanese Grand Prix | cadillac | 2 | 2 | 0 | 0 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | mclaren | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | mercedes | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | red-bull-racing | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | ferrari | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | williams | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | racing-bulls | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | haas | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | audi | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | alpine | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Spanish Grand Prix | cadillac | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | mclaren | 7 | 7 | 0 | 5 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | mercedes | 2 | 2 | 0 | 0 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | red-bull-racing | 7 | 7 | 0 | 5 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | ferrari | 11 | 11 | 0 | 4 → 11 publicadas; reconstrucción desde PDF; sin representación fiel previa: 9; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | williams | 7 | 7 | 0 | 3 → 7 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | racing-bulls | 6 | 6 | 0 | 3 → 6 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | aston-martin | 0 | 0 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | haas | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | audi | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | alpine | 6 | 6 | 0 | 2 → 6 publicadas; reconstrucción desde PDF; sin representación fiel previa: 4; atribuciones erróneas identificadas: 0; duplicados previos: 0
Miami Grand Prix | cadillac | 9 | 9 | 0 | 2 → 9 publicadas; reconstrucción desde PDF; sin representación fiel previa: 7; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | mclaren | 6 | 6 | 0 | 4 → 6 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | mercedes | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | red-bull-racing | 4 | 4 | 0 | 2 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | ferrari | 3 | 3 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | williams | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | racing-bulls | 2 | 2 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | aston-martin | 3 | 3 | 0 | 2 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 2; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | haas | 3 | 3 | 0 | 0 → 3 publicadas; reconstrucción desde PDF; sin representación fiel previa: 3; atribuciones erróneas identificadas: 1; duplicados previos: 0
Monaco Grand Prix | audi | 4 | 4 | 0 | 3 → 4 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | alpine | 1 | 1 | 0 | Columnas originales, encabezado y ES verificados; sin representación fiel previa: 0; atribuciones erróneas identificadas: 0; duplicados previos: 0
Monaco Grand Prix | cadillac | 2 | 2 | 0 | 1 → 2 publicadas; reconstrucción desde PDF; sin representación fiel previa: 1; atribuciones erróneas identificadas: 0; duplicados previos: 0

## Comparación con la publicación anterior

La comparación vincula una fila anterior sólo cuando contiene las cuatro celdas EN completas de una única fila FIA reconstruida. “Sin representación fiel previa” incluye filas ausentes, truncadas, con columnas perdidas o asignadas a otro equipo. No se afirma que toda fila sin coincidencia estuviera ausente: la pérdida de estructura del parser anterior impide resolver algunas identidades de forma inequívoca. Las atribuciones incorrectas listadas requieren una coincidencia única de las cuatro celdas; las coincidencias ambiguas o imposibles quedan documentadas con su texto original en sourceComparison.unmatchablePreviousRows de data/fia-audit/2026.json. Ese archivo detalla también los duplicados anteriores y cada fila reconstruida sin representación fiel. Las cero filas faltantes finales se verifican por GP/equipo contra las coordenadas originales del PDF y el inventario visual de la tabla rasterizada.

Atribuciones erróneas identificadas inequívocamente:

- Austrian Grand Prix: red-bull-racing → ferrari, página 9, fila 1 (Front Wing Endplate).
- Bahrain Grand Prix: red-bull-racing → ferrari, página 8, fila 1 (Diffuser).
- Monaco Grand Prix: aston-martin → haas, página 16, fila 2 (Rear Wing).

## PDFs oficiales y hashes

GP | Doc | Páginas | SHA-256 | Fuente
--- | --- | ---: | --- | ---
Australian Grand Prix | 9 | 24 | `9e9ccc09667faa4f612a32edab64e41b1d7ff914778e5681d96cd4ff81dbb5dd` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_australian_grand_prix_-_car_presentation_submissions.pdf)
Austrian Grand Prix | 14 | 23 | `7863deb797bed267fdd978e66170d86f755cf576cffce202739fadf712de0a6c` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_austrian_grand_prix_-_car_presentation_submissions.pdf)
Azerbaijan Grand Prix | 11 | 20 | `1616de8a9a2118873ff2146d08df6a98479e777d4012aa430a40766e563699b2` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_azerbaijan_grand_prix_-_car_presentation_submissions.pdf)
Bahrain Grand Prix | 12 | 19 | `be68005deb6890e760be6fc032dc7026c7a44f8761ad5894a617d855e9218e3c` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_bahrain_grand_prix_in_malaysia_-_car_presentation_submissions.pdf)
Barcelona-Catalunya Grand Prix | 14 | 20 | `26ba7ae0bf3556c02d0ba691fa350f7d56ec08e9d1830ff10b416429a833c7e9` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_barcelona-catalunya_grand_prix_-_car_presentation_submissions.pdf)
Belgian Grand Prix | 12 | 21 | `e3edc39edb92db8b85e8b9216a75979b0738957acd009d0ed0ab4fb87ecd7264` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_belgian_grand_prix_-_car_presentation_submissions.pdf)
British Grand Prix | 13 | 18 | `949f1403db5591bb62d84c2f0a3072368d725207a8f281dcf5b9a458a7d04204` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_british_grand_prix_-_car_presentation_submissions.pdf)
Canadian Grand Prix | 11 | 21 | `5971fae2e70a5e17ad87fbdd400e2287f064ee830dfdada8be9f7f36c882193e` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_canadian_grand_prix_-_car_presentation_submissions.pdf)
Chinese Grand Prix | 10 | 16 | `e113dd8e20a71be5f18ff28e8a94351d2699895e09207294f73cfaecd395840b` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_chinese_grand_prix_-_car_presentation_submissions.pdf)
Dutch Grand Prix | 10 | 19 | `9c24cee9ec4775e7dd507654b13692500ef9e41e8b1625982a5ab8e2a92100a4` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_dutch_grand_prix_-_car_presentation_submissions.pdf)
Hungarian Grand Prix | 9 | 23 | `59d9c9d893c2f83c50e65abe2be06cfaad56552c5cdecbbca7e0f3b7e4196ace` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_hungarian_grand_prix_-_car_presentation_submissions.pdf)
Italian Grand Prix | 10 | 22 | `55541780261498d2f329dae1748df636a871072f26a580dd027de78669442d81` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_car_presentation_submissions.pdf)
Japanese Grand Prix | 11 | 19 | `a8fcc30bcae36d21d52c7d3c50dc76c197949b48843653c15ae9d15facaec3a6` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_japanese_grand_prix_-_car_presentation_submissions.pdf)
Spanish Grand Prix | 11 | 18 | `c92e9191ede7c2bbb5aeabb8b2026f599d3f71fe432bc55311d63cfa1cb6f6a7` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_spanish_grand_prix_-_car_presentation_submissions.pdf)
Miami Grand Prix | 8 | 25 | `3ba75eb51c6ce045b3e5c11279e359e1ddaa0f825a251886d9c6f7a7b307de5e` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_miami_grand_prix_-_car_presentation_submissions.pdf)
Monaco Grand Prix | 15 | 23 | `513eca62751dd9e24be31a313058e3efc949ad72ed25a21fbd5a86d1f2355996` | [PDF FIA](https://www.fia.com/system/files/decision-document/2026_monaco_grand_prix_-_car_presentation_submissions.pdf)

## Validación final y estado Git

- Rama: dev. HEAD local y remoto: `46ca755d3f9c259cb5dcb3ee9ef4204f27e4e45e`.
- Suite completa: 151 tests pasados, 0 fallos, 0 omitidos.
- Typecheck: `npx tsc -b --pretty false`, correcto.
- Build: `npm run build`, correcto (Vite advierte sobre bundles grandes).
- `git diff --check`, correcto.
- Segunda descarga/reingesta desde los 16 URLs FIA: todos UNCHANGED; ninguna publicación reescrita.
- Sin commit, push, merge ni deploy; main no se modificó.

## Totales por GP

GP | FIA factuales | Publicadas | Manual review
--- | ---: | ---: | ---:
Australian Grand Prix | 43 | 39 | 4
Austrian Grand Prix | 41 | 41 | 0
Azerbaijan Grand Prix | 38 | 38 | 0
Bahrain Grand Prix | 14 | 14 | 0
Barcelona-Catalunya Grand Prix | 18 | 18 | 0
Belgian Grand Prix | 21 | 21 | 0
British Grand Prix | 9 | 9 | 0
Canadian Grand Prix | 39 | 39 | 0
Chinese Grand Prix | 7 | 7 | 0
Dutch Grand Prix | 23 | 23 | 0
Hungarian Grand Prix | 37 | 37 | 0
Italian Grand Prix | 26 | 26 | 0
Japanese Grand Prix | 16 | 16 | 0
Spanish Grand Prix | 10 | 10 | 0
Miami Grand Prix | 58 | 58 | 0
Monaco Grand Prix | 31 | 31 | 0

## Archivos modificados o añadidos

- `data/fia-audit/2026-manual-review.json`
- `data/fia-audit/2026.json`
- `data/fia-reviewed-sections/2026.json`
- `docs/fia-2026-full-audit.md`
- `ingestion/fia/audit-comparison.mjs`
- `ingestion/fia/full-audit.mjs`
- `ingestion/fia/normalizer.mjs`
- `ingestion/fia/parser.mjs`
- `ingestion/fia/publication.mjs`
- `ingestion/fia/reconstruct.mjs`
- `ingestion/fia/reviewed-sections.mjs`
- `ingestion/fia/run.mjs`
- `ingestion/fia/scheduled.mjs`
- `ingestion/fia/validator.mjs`
- `public/data/grands-prix/2026/australia-2026.json`
- `public/data/grands-prix/2026/austria-2026.json`
- `public/data/grands-prix/2026/azerbaijan-2026.json`
- `public/data/grands-prix/2026/bahrain-2026.json`
- `public/data/grands-prix/2026/barcelona-catalunya-2026.json`
- `public/data/grands-prix/2026/belgian-2026.json`
- `public/data/grands-prix/2026/british-2026.json`
- `public/data/grands-prix/2026/canada-2026.json`
- `public/data/grands-prix/2026/china-2026.json`
- `public/data/grands-prix/2026/dutch-2026.json`
- `public/data/grands-prix/2026/hungarian-2026.json`
- `public/data/grands-prix/2026/italian-grand-prix-2026.json`
- `public/data/grands-prix/2026/japan-2026.json`
- `public/data/grands-prix/2026/madrid-grand-prix-2026.json`
- `public/data/grands-prix/2026/miami-2026.json`
- `public/data/grands-prix/2026/monaco-2026.json`
- `src/data/fia-localization/es.json`
- `src/data/fia-localization/terms-es.json`
- `src/services/fia/localization.mjs`
- `src/services/fia/published-dataset.ts`
- `tests/bahrain-publication.test.mjs`
- `tests/fia-2026-full-audit.test.mjs`
- `tests/fia-ingestion.test.mjs`
- `tests/fia-localization.test.mjs`
- `tests/fixtures/fia-2026-official-layouts.json.gz`
- `tests/fixtures/fia-2026-official-layouts.md`
- `tests/fixtures/fia-presentation-layout.json`
