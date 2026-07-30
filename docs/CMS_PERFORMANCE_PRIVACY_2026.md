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
- ScrollTrigger distribuye la secuencia completa a lo largo del recorrido y también puede sincronizar el tiempo de un MP4 o WebM con el scroll.
- La secuencia móvil se utiliza en teléfonos; si no existe, se reutiliza la secuencia de escritorio, y viceversa.
- `FabrickSignatureExperience` permanece conservado como código histórico, pero no se importa en Inicio ni en la vista previa del editor.

## Base de datos

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

El preview final del 30 de julio de 2026 comprobó:

1. Generación correcta del import map.
2. Preparación de migraciones con `0` marcadores eliminados.
3. Aplicación idempotente de migraciones.
4. Ejecución de la semilla de componentes Anime.js.
5. TypeScript y compilación de Next.js correctos.
6. Generación completa de 17 de 17 páginas estáticas.
7. Portada pública respondiendo HTTP 200.
8. Presencia del portfolio cinematográfico aprobado en Inicio.
9. Ausencia del visor Fabrick Signature en Inicio.
10. Ausencia de errores de runtime después del despliegue.

## Preview validado

- Revisión de código desplegada: `01e519bf1f4021128be0dbaad01cc607412d8917`.
- Deployment: `dpl_3CxtgcnGmJVrR9L5WqEu8d1MDyPJ`.
- Estado: `READY`.
- URL: `fabrickbuild-s2gsb0bno-think-fastzs-projects.vercel.app`.
- Los commits posteriores marcados con `[skip ci]` solo documentan esta validación y no cambian el código ejecutable desplegado.
- Estado multimedia: el Background `Casa / home` sigue relacionado con `0` frames de escritorio y `0` móviles; debe volver a cargarse desde Backgrounds/Multimedia.

## Despliegue

Los cambios permanecen en una rama y PR draft. No deben fusionarse con `main` hasta completar la prueba visual final y volver a cargar la secuencia multimedia.
