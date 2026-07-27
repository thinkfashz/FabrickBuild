# FabrickBuild CMS

CMS, CRM, frontend y estudio de IA para Soluciones Fabrick.

## Incluye

- **Payload CMS 3** integrado en Next.js 16.
- Panel privado en `/admin` con usuarios `admin` y `editor`.
- Constructor visual de páginas por bloques.
- Páginas, servicios, proyectos, testimonios y biblioteca multimedia.
- CRM de cotizaciones con estado, prioridad, responsable y notas internas.
- Borradores, historial, autosave, publicación programada y Live Preview.
- SEO por documento y configuración general del sitio.
- PostgreSQL/Neon y Vercel Blob.
- FabrickBuild AI Studio con chat multi-modelo y previews reversibles.
- Integraciones cifradas para IA, Resend y Cloudinary.

## Rutas

| Área | Ruta |
|---|---|
| Sitio público | `/` |
| Administrador | `/admin` |
| FabrickBuild AI Studio | `/studio/ia` |
| Integraciones | `/studio/integraciones` |
| Historial de cambios IA | `/admin/collections/ai-changes` |
| Integraciones en Payload | `/admin/collections/integrations` |
| Salud del sistema | `/api/system/health` |
| API REST | `/api/:collection` |
| GraphQL | `/api/graphql` |
| Servicios | `/servicios` |
| Proyectos | `/proyectos` |

## FabrickBuild AI Studio

El estudio permite conectar proveedores de IA, conversar mediante streaming, seleccionar modelos y generar dos propuestas visuales antes de modificar una página.

El flujo de diseño es reversible:

1. La IA devuelve dos opciones con HTML de preview, CSS aislado y bloques Payload compatibles.
2. Cada preview se ejecuta dentro de un `iframe` con `sandbox` vacío.
3. El servidor elimina elementos y atributos peligrosos y rechaza CSS no aislado.
4. Al aplicar, se reemplazan completamente el layout y el estilo IA de esa página.
5. El estado anterior queda guardado en `ai-changes`.
6. Deshacer restaura exactamente el snapshot anterior.
7. El rollback se detiene cuando detecta cambios posteriores para no sobreescribir trabajo nuevo.

### Proveedores compatibles

- Ollama Cloud, con prioridad predeterminada.
- OpenAI / ChatGPT.
- Anthropic / Claude.
- OpenRouter.
- Z.AI / GLM.
- Servidores compatibles con OpenAI, incluido un flujo OpenCode configurable.
- Resend.
- Cloudinary.

El panel registra los modelos disponibles, modelo predeterminado, estado de conexión, tokens informados, solicitudes, tiempo activo, fecha de expiración cuando existe, límites expuestos por el proveedor y datos de uso compatibles.

## Protección de credenciales

Las credenciales se cifran en el servidor con AES-256-GCM. El navegador solo recibe una pista enmascarada; la clave completa no se devuelve después de guardarse.

- Solo los administradores pueden entrar al estudio y gestionar integraciones.
- Las claves cifradas, IV y etiqueta de autenticación están ocultas en Payload.
- Las pruebas se ejecutan en servidor.
- El chat nunca envía credenciales al cliente.
- Las previews no tienen permisos de script, navegación, formularios ni recursos externos.
- El CSS generado debe quedar bajo `.ai-page` y no puede usar `@import`, `url()`, `javascript:` ni `position: fixed`.

## Variables de entorno

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=verify-full
PAYLOAD_SECRET=replace-with-at-least-32-random-characters
PREVIEW_SECRET=replace-with-a-different-long-random-secret
NEXT_PUBLIC_SERVER_URL=https://fabrickbuild.vercel.app
INTEGRATION_ENCRYPTION_KEY=replace-with-a-dedicated-secret-of-at-least-32-characters
BLOB_READ_WRITE_TOKEN=
BOOTSTRAP_SECRET=
SEED_SECRET=replace-with-another-long-random-secret
ADMIN_EMAIL=admin@solucionesfabrick.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

`INTEGRATION_ENCRYPTION_KEY` es opcional, pero recomendado. Cuando no existe, el sistema deriva una clave desde `PAYLOAD_SECRET`.

También se reconoce el nombre generado por algunas instalaciones de Blob:
`BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN`.

## Base de datos y despliegue

Cada build de Vercel ejecuta una sincronización aditiva del esquema. Solo aplica cambios cuando Drizzle no detecta advertencias ni pérdida de datos. Si una modificación fuera destructiva, el deployment se detiene antes de publicar.

La conexión PostgreSQL normaliza `sslmode=prefer`, `require` o `verify-ca` a `sslmode=verify-full` para conservar la verificación completa del certificado.

## Seguridad de usuarios

- Solo un administrador puede crear usuarios.
- Los editores solo pueden leer y actualizar su propia cuenta.
- Solo un administrador puede cambiar roles o eliminar usuarios.
- No se puede eliminar ni degradar al último administrador.
- Hay bloqueo automático después de cinco intentos fallidos.
- Los tokens no se devuelven en las respuestas de autenticación.
- La instalación usa comparación de secreto en tiempo constante, verificación de origen, limitación de intentos y bloqueo advisory de PostgreSQL.

## Desarrollo local

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Licencia

La identidad FabrickBuild y el código personalizado conviven con la licencia MIT y la atribución original de Payload CMS preservadas en `LICENSE.md` y `NOTICE.md`.
