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

El commit final debe comprobar, en este orden:

1. Generación del import map.
2. Eliminación del marcador de desarrollo sin modificar datos comerciales.
3. Aplicación idempotente de migraciones.
4. Creación idempotente de los componentes Anime.js.
5. TypeScript y compilación de Next.js.
6. Apertura de portada, páginas legales, admin y preview móvil.
7. Ausencia de errores de esquema en runtime.
8. Cabeceras de caché públicas para visitantes y privadas para admin, preview y formularios.

## Despliegue

Los cambios permanecen en una rama y PR draft. No deben fusionarse con `main` hasta validar el preview, las rutas legales, el administrador y los logs de runtime.
