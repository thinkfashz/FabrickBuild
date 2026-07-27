# FabrickBuild CMS

CMS, CRM y frontend integral para Soluciones Fabrick.

## Incluye

- **Payload CMS 3** integrado en Next.js 16.
- Panel privado en `/admin` con usuarios `admin` y `editor`.
- Instalador web único y bloqueable en `/instalar`.
- Constructor visual de páginas por bloques.
- Páginas, servicios, proyectos, testimonios y biblioteca multimedia.
- CRM de cotizaciones con estado, prioridad, responsable y notas internas.
- Borradores, historial, autosave, publicación programada y Live Preview.
- SEO por documento y configuración general del sitio.
- PostgreSQL/Neon y Vercel Blob.
- Frontend responsive para servicios, proyectos, antes/después y formularios.
- Seed idempotente con contenido inicial de FabrickBuild.

## Rutas

| Área | Ruta |
|---|---|
| Sitio público | `/` |
| Instalación única | `/instalar` |
| Administrador | `/admin` |
| Salud del sistema para administradores | `/api/system/health` |
| API REST | `/api/:collection` |
| GraphQL | `/api/graphql` |
| Servicios | `/servicios` |
| Proyectos | `/proyectos` |

## Variables

```bash
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
PREVIEW_SECRET=...
NEXT_PUBLIC_SERVER_URL=https://fabrickbuild.vercel.app
BLOB_READ_WRITE_TOKEN=...
SEED_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

`BOOTSTRAP_SECRET` puede configurarse por separado. Si no existe, el instalador usa
`SEED_SECRET`. Los secretos de Payload e instalación deben tener al menos 32 caracteres y la
contraseña inicial debe tener al menos 16.

## Instalación web sin Termux

1. Conecta Neon y Vercel Blob al proyecto.
2. Configura las variables anteriores para Production y Preview.
3. Despliega la rama del CMS.
4. Abre `/instalar` en el deployment.
5. Introduce `BOOTSTRAP_SECRET` o `SEED_SECRET` y confirma.

El instalador:

- sincroniza únicamente una base vacía o compatible;
- se detiene si detecta advertencias o posible pérdida de datos;
- crea o valida el superadministrador configurado;
- comprueba el inicio de sesión;
- carga servicios y portada iniciales;
- verifica todas las colecciones y Vercel Blob;
- registra el resultado en un esquema separado `fabrickbuild_system`;
- se bloquea permanentemente tras completarse.

## Seguridad de usuarios

- Solo un administrador puede crear usuarios.
- Los editores solo pueden leer y actualizar su propia cuenta.
- Solo un administrador puede cambiar roles o eliminar usuarios.
- No se puede eliminar ni degradar al último administrador.
- Hay bloqueo automático después de cinco intentos fallidos.
- Los tokens no se devuelven en las respuestas de autenticación.
- La instalación usa comparación de secreto en tiempo constante, verificación de origen,
  limitación de intentos, bloqueo advisory de PostgreSQL y cierre permanente tras el éxito.
- El antiguo endpoint reutilizable de seed fue eliminado.

## Instalación local opcional

```bash
npm install
npm run setup
npm run dev
```

El flujo local sigue disponible para desarrollo, pero no es necesario para instalar producción.

## Licencia

La identidad FabrickBuild y el código personalizado conviven con la licencia MIT y la
atribución original de Payload CMS preservadas en `LICENSE.md` y `NOTICE.md`.
