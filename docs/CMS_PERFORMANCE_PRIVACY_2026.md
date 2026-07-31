# FabrickBuild CMS, rendimiento y privacidad 2026

Esta entrega conecta el editor de Payload con el frontend público mediante una cadena verificable:

1. Campo o Global administrable.
2. Persistencia PostgreSQL mediante migraciones versionadas.
3. Consulta pública cacheada y preview dinámico aislado.
4. Renderer con variables CSS responsivas.
5. Invalidación al publicar.

## Funciones incluidas

- Apariencia general y por bloque: sólido, transparente, glass, imagen, colores, opacidad, blur, bordes, tamaños y espaciado.
- Composición móvil, alineación móvil, escala de títulos y ocultación por dispositivo.
- Background de imagen o video desde el editor de la propia página.
- Navbar y footer administrables con logo móvil centrado exactamente.
- Loader global configurable con cierre anticipado y límite máximo de cuatro segundos.
- Consentimiento necesario y opcional por categorías.
- Páginas de privacidad, cookies y términos actualizadas al 30 de julio de 2026.
- Anime.js con componentes reutilizables de botón, card y texto.
- Carga progresiva de frames y variantes WebP responsivas.
- Caché pública con invalidación al publicar.
- Formulario público validado, protegido y con consentimiento explícito.

## Portfolio cinematográfico y Backgrounds

- `Portfolio cinematográfico` es el diseño preestablecido de fábrica para Inicio y conserva la composición visual aprobada antes de las mejoras del CMS.
- El Background se toma de `Páginas → Inicio → Diseño de página → Background multimedia` o, cuando no hay una selección directa, del último Background `Hero / portada` marcado como listo.
- Desde el editor de la página se puede subir un video y elegir libremente la cantidad de frames: 60, 80, 120 o cualquier cantidad válida.
- La cantidad de frames no se recorta durante el guardado, la recuperación ni la reproducción. La carga progresiva por lotes reduce el consumo sin eliminar fotogramas.
- ScrollTrigger distribuye la secuencia completa a lo largo del recorrido.
- La secuencia móvil se utiliza en teléfonos; si no existe una secuencia de escritorio, se reutiliza como fallback con ajuste `cover`.
- Si PostgreSQL pierde las relaciones de Multimedia, el renderer recupera los pathnames reales desde Vercel Blob sin duplicar los archivos.
- Los Blobs privados se entregan mediante `/api/blob-frame/[...pathname]`, limitada exclusivamente a imágenes dentro de `frames/`.
- El primer y último Blob se validan como `image/*` durante el build antes de publicar la secuencia.
- El motor precarga una ventana pequeña alrededor del scroll, limita reintentos y conserva el último frame válido si una imagen aislada falla.
- `FabrickSignatureExperience` permanece conservado como código histórico, pero no se importa en Inicio ni en la vista previa del editor.

## Base de datos y almacenamiento

Payload selecciona la conexión en este orden:

1. `PAYLOAD_DATABASE_URL`
2. `POSTGRES_URL`
3. `DATABASE_URL`

El deployment actual detectó que PostgreSQL conserva el Background `Casa / home`, pero no devuelve registros de `media`. Los 61 binarios continúan en el almacén privado de Vercel Blob y se recuperan desde allí como fallback seguro.

El build ejecuta:

```text
payload generate:importmap
payload run src/scripts/prepareProductionMigrations.ts
payload migrate --force-accept-warning
payload run src/scripts/seedAnimatedComponents.ts
next build
```

La preparación elimina únicamente los marcadores históricos de desarrollo con `batch = -1`. El adaptador PostgreSQL queda con `push: false` para impedir que el esquema de producción vuelva a modificarse automáticamente fuera del sistema de migraciones.

## Validación de entrega

La revisión final comprobó:

1. Generación correcta del import map.
2. Preparación y aplicación idempotente de migraciones.
3. TypeScript y compilación de Next.js correctos.
4. Generación completa de 17 de 17 páginas estáticas.
5. Portada pública respondiendo HTTP 200.
6. Presencia del portfolio cinematográfico aprobado en Inicio.
7. Ausencia del visor Fabrick Signature en Inicio.
8. Detección y orden correcto de `frame_001` a `frame_061`.
9. Secuencia de 61 frames para móvil y fallback de 61 frames en escritorio.
10. Rutas internas del mismo dominio para impedir errores de acceso a Blob privado.
11. Ausencia de errores de runtime en la ruta de entrega.
12. Contador inicial `01 / 61` y actualización mediante ScrollTrigger.

## Corrección de credenciales Blob

La ruta de entrega y la validación del build utilizan explícitamente la misma credencial disponible, incluyendo compatibilidad con el nombre heredado de la integración. Esto evita respuestas HTTP 502 y garantiza que los PNG privados puedan dibujarse en Canvas y WebGL.

## Estado del PR

Los cambios permanecen en `agent/complete-cms-performance` y el PR #5 continúa abierto, en draft y sin fusionarse con `main` hasta completar la revisión del propietario.