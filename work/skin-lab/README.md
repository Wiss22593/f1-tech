# Laboratorio local Mercedes: geometría compartida y atlas por piloto

Experimento privado y reversible. No editar ni desplegar la compilación de laboratorio como producción. No tiene efecto en el Garage normal ni en su compilación habitual. No modifica ningún GLB original, mapping, cámara, dataset, material fuente o servicio.

Desde C:\Users\mb937\Desktop\f1-tech:

    node work/skin-lab/server.mjs --build
    node work/skin-lab/preview.mjs

Abrir http://127.0.0.1:5195/inicio?team=mercedes&driver=russell&skinLab=1

Para comparar el cargador original en la misma compilación: skinLab=0. Sin skinLab=1, OFF. El parámetro solo opera en la compilación aislada. Solo se interceptan las dos rutas Mercedes; Ferrari y el resto usan el cargador original. Detener el servidor con Ctrl+C. Puerto ligado a 127.0.0.1.

La base es el Russell original, cargado una vez mientras Mercedes siga montado. Antonelli cambia únicamente cuatro materiales que apuntan al atlas image[6], conservando las variantes finales del GLTFLoader y compartiendo las otras texturas. El atlas PNG extraído es idéntico al original; se reutiliza la conversión existente a 4096x1365, sRGB y flipY=false con UV0/UV1 apropiados. No hay DDS, KTX2 ni recompresión en este experimento.

La base y ambos resultados están limitados a Mercedes. Al abandonar el equipo, la última referencia programa liberación de geometrías y texturas propias después de 1500 ms. Esta ventana es de conveniencia para cambios inmediatos y StrictMode; no retiene los 22 coches. El resultado por piloto cambia de escena/materiales sin mutar el original ni las geometrías. F1tech_maps sigue entrando por el visor original.

Importante: comenzar directamente con Antonelli aún carga Russell como base y después su PNG. Para una migración real se necesitaría una base sin atlas de piloto; ese trabajo NO está implementado ni autorizado. No desplegar estos assets de evaluación: la documentación del proyecto no acredita derechos comerciales o de redistribución.

server.mjs transforma imports y añade diagnósticos solo durante la compilación de laboratorio. build/ es generado, sin copiar public/. preview.mjs sirve GLB originales en lectura y los dos assets separados con max-age=3600 para el experimento. Las cabeceras no representan Netlify. window.__skinLab, __skinLabModel y __skinLabRenderer son diagnósticos exclusivos de esta compilación.
