# FabrickBuild CMS

CMS, CRM y frontend integral para Soluciones Fabrick.

## Incluye

- **Payload CMS 3** integrado en Next.js 16.
- Panel privado en `/admin` con usuarios `admin` y `editor`.
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
| Administrador | `/admin` |
| API REST | `/api/:collection` |
| GraphQL | `/api/graphql` |
| Servicios | `/servicios` |
| Proyectos | `/proyectos` |

## Variables

Copia `.env.example` a `.env.local`:

```bash
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
PREVIEW_SECRET=...
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=...
SEED_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

`DATABASE_URL`, `PAYLOAD_SECRET` y `PREVIEW_SECRET` son obligatorias. En Vercel,
`BLOB_READ_WRITE_TOKEN` evita que los archivos subidos desaparezcan al cambiar de despliegue.

## Instalación local

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` sincroniza el esquema de una base PostgreSQL nueva y ejecuta el seed.
Debe ejecutarse de forma consciente al instalar o modificar el modelo. Después, el trabajo de
producción debe pasar a migraciones versionadas.

También se puede ejecutar por separado:

```bash
npm run db:push
npm run seed
```

## Primer acceso

Si el seed creó el usuario, entra con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Si no se definieron,
abre `/admin` y crea el primer usuario. Después cambia cualquier contraseña temporal.

## Despliegue en Vercel

1. Conecta el repositorio a Vercel.
2. Añade una base Neon desde Vercel Marketplace.
3. Añade Vercel Blob.
4. Configura los secretos y URL pública.
5. Ejecuta una vez `npm run setup` contra la base nueva desde un entorno autorizado.
6. Despliega y abre `/admin`.

El frontend muestra una portada de respaldo mientras la base aún no está conectada. El panel y
los datos dinámicos requieren PostgreSQL.

## Seguridad

- Los visitantes solo pueden crear contactos y leer contenido publicado.
- El panel exige autenticación.
- Solo administradores pueden borrar usuarios o cambiar roles.
- Las vistas previas requieren `PREVIEW_SECRET`.
- El seed remoto requiere `SEED_SECRET` en el encabezado `Authorization: Bearer ...`.

## Licencia

La identidad FabrickBuild y el código personalizado conviven con la licencia MIT y la
atribución original de Payload CMS preservadas en `LICENSE.md` y `NOTICE.md`.
