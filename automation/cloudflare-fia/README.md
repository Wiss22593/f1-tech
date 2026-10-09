# F1 TECH: disparador redundante Cloudflare

Estado: preparado y probado localmente; NO desplegado ni autenticado contra GitHub. No hay evidencia todavía de cron externo -> dispatch -> commit del bot. Base auditada: 4d0950755c50bc0042d094a692dc8fa4eca96978 (2026-10-09).

## Activación mínima

1. Iniciar sesión o crear cuenta en https://dash.cloudflare.com/ y mantener Workers Free. No hace falta dominio ni Netlify.
2. En https://github.com/settings/personal-access-tokens/new crear token fine-grained para **solo Wiss22593/f1-tech**. Permisos: **Actions: Read and write**, **Contents: Read-only**, Metadata read (automático). No conceder Contents write, administración ni acceso a otros repos. Elegir vencimiento y renovar antes de esa fecha; un token vencido impide los disparos.
3. Incorporar este parche a main tras revisión. Conservar el cron GitHub `17,47 * * * *` y el grupo de concurrencia existente.
4. En PowerShell, desde `automation/cloudflare-fia/` de la copia aislada:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm ci
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ALERT_WEBHOOK
npm run deploy
```

El token se pega **solo en la entrada secreta de Wrangler**, nunca aquí, en un comando literal, archivo, URL o repositorio. El webhook actual usa formato Discord (`content`); para otro proveedor adaptar el envío antes de activar. La dirección también es secreta. No hay una ruta HTTP pública para disparar ejecuciones. Wrangler puede pedir elegir la cuenta si hay más de una. No activar Workers Paid.

5. Esperar un tick real del cron `*/10 * * * *` UTC; no pulsar Run workflow ni enviar un dispatch de prueba. La propagación inicial puede tardar hasta 15 minutos. Abrir Workers -> f1-tech-fia-trigger -> Logs y GitHub Actions. Ver `DISPATCH_ACCEPTED` significa petición aceptada, **no publicado**. Confirmar una corrida `workflow_dispatch` posterior, todos los pasos de validación y finalmente commit de `github-actions[bot]` con el dataset. Correlacionar UUID/hora del log con hora y workflow en GitHub. Comprobar luego `ALREADY_PUBLISHED` y ausencia de nuevos dispatches para ese GP.
6. Confirmar recepción real de alertas antes de considerar el servicio plenamente activado. `ALERT_CHANNEL_NOT_CONFIGURED` o `ALERT_DELIVERY_FAILED` indica que esa parte no funciona. Configurar notificaciones de fallos GitHub también permite observar fallos del cron original.

## Funcionamiento y seguridad

El Worker no descarga PDFs ni traduce. El cron llama a un único Durable Object SQLite privado, que mantiene lease transaccional, cooldown persistente de 9 minutos y backoff. Reutiliza el calendario FIA/F1 y la misma ventana de tres días antes de FP1 y dos después del fin local del GP. Cancelaciones, cambios y conflictos usan las reglas existentes. El snapshot FIA solo sustituye una FIA inaccesible con validación de vigencia; nunca sustituye el calendario y FP1 vivos de F1. El snapshot 2026 vence el 7 de diciembre: actualizar fuentes y registro al incorporar otra temporada.

Lee main por SHA y valida el dataset con **el mismo validador del publicador**, más fechas y contadores completos. JSON existente o malformado no acredita publicación. Si falta, consulta ejecuciones activas y llama `POST /repos/Wiss22593/f1-tech/actions/workflows/fia-auto-publish.yml/dispatches` con `ref: main`. Un PDF ausente no instala el traductor: GitHub mantiene su preflight económico. La publicación preserva el original FIA y política ES existente.

No hay reintento inmediato del POST: un timeout puede haber sido aceptado. Se reconcilian ejecuciones en el siguiente tick. Errores transitorios usan 10/20/40/60 minutos de backoff; 403/404 esperan una hora; 429 respeta Retry-After y reset de cuota. Timeout GitHub de 12 segundos. El cliente oficial compartido reintenta hasta tres veces, con timeouts y backoff ya existentes. Los logs propios no incluyen tokens, cuerpos de error ni webhook. Las alertas se limitan a una por tipo cada seis horas y vuelven a intentar si su entrega falla. A partir de FP1 +4 horas, falta de publicación genera aviso de documento/publicación demorada; no asegura distinguir PDF ausente de pipeline fallido.

Dos invocaciones Cloudflare comparten lease atómico persistente de cinco minutos. GitHub cron y dispatch comparten `fia-auto-publish-main`, sin cancelar la corrida activa. Antes del commit se vuelve a leer main y validar su dataset: si ya existe una publicación completa, se omite el commit; si main avanzó de otra manera se aborta y reintenta en cron posterior. Un cambio entre esa comprobación y push produce rechazo de fast-forward; nunca se fuerza push ni se pisa trabajo concurrente. La carrera entre un schedule y el despacho puede producir dos corridas, pero el segundo publicador verifica el dataset y omite publicación duplicada. GitHub puede reemplazar ejecuciones pendientes del mismo grupo: no es una cola durable.

## Coste y límites comprobados

- Workers Free: 100.000 requests/día, 5 cron triggers/cuenta, 10 ms CPU en el handler cron. Ese handler solo invoca el objeto; análisis y coordinación ocurren en el Durable Object, cuyo límite publicado es 30 s CPU/request. Hay 144 ticks diarios como máximo nominal.
- Durable Objects SQLite está disponible gratis: 100.000 requests/día, 13.000 GB-s/día, 5 millones de filas leídas/día, 100.000 escritas/día y 5 GB totales. Se usa un objeto con pocas claves. Las cuotas de cuenta se comparten con otros servicios; comprobar métricas reales tras activar. En Free, exceder cuotas bloquea operaciones.
- El repo auditado es público y usa runner estándar Ubuntu: los minutos de ese runner son gratuitos. Artefactos y cachés tienen cuotas separadas; no equivale a almacenamiento ilimitado. Si el repo se vuelve privado, Free incluye 2.000 minutos mensuales compartidos: reducir frecuencia antes de hacerlo. En ventana pendiente puede haber hasta 144 dispatches/día, más 48 schedules nominales, generalmente solo preflight.
- Ninguna de estas verificaciones acredita un SLA de puntualidad gratuito. Redundancia reduce dependencia del scheduler GitHub, pero ambos siguen dependiendo de GitHub para ejecutar/publicar, FIA/F1 para fuentes y credenciales vigentes. Una interrupción total de Cloudflare no puede alertar desde el propio Worker; una garantía de supervisión independiente necesitaría otro monitor.

Fuentes oficiales verificadas el 2026-10-09:
https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
https://docs.github.com/en/billing/concepts/product-billing/github-actions
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/workers/configuration/cron-triggers/
https://developers.cloudflare.com/durable-objects/platform/pricing/
https://developers.cloudflare.com/durable-objects/platform/limits/

## Validación reproducible

Desde la raíz: `npm ci`, `npm test`, `npm run lint`, `npm run build`.
Desde este directorio: `npm ci`, `npm run build`, `npm test`, `node --test runtime.test.mjs`.
Build Worker es dry-run y no despliega. El test del runtime comprueba concurrencia real SQLite y persistencia al recargar, sin credenciales. Los tests de dispatch son mocks: no acreditan autorización real de token ni ejecución remota. Esa prueba queda para el cron desplegado.

Diagnóstico real de Singapur: el preflight de solo lectura del 2026-10-09 16:17 UTC encontró Doc 9 en FIA y devolvió NEEDS_PIPELINE; main no contenía `public/data/grands-prix/2026/singapore-2026.json`. No se creó ningún dataset manual. La corrida verde 37950375399 (15:15 UTC) omitió descubrimiento/publicación y precede a la corrección 4d09507; no usarla como prueba de éxito actual.
