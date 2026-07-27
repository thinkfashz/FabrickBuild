# Despliegue de FabrickBuild CMS

## Estado actual

La aplicación usa Next.js, Payload CMS, PostgreSQL/Neon y Vercel Blob.

El esquema, el contenido inicial y el superadministrador se inicializan mediante un bootstrap idempotente durante el build de Vercel.

En el primer deployment compatible, la rutina:

1. verifica las variables obligatorias;
2. crea el esquema de Payload en PostgreSQL;
3. crea o repara el superadministrador configurado;
4. comprueba el inicio de sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`;
5. carga la portada, los servicios y la configuración inicial;
6. comprueba Vercel Blob;
7. registra el resultado en `fabrickbuild_system.bootstrap_state`;
8. bloquea la instalación inicial para evitar repeticiones destructivas.

En los deployments posteriores, la rutina solo verifica el estado, el superadministrador y su contraseña. No vuelve a recrear la base ni duplica el contenido.

## Variables obligatorias

```env
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=secreto-largo
PREVIEW_SECRET=secreto-largo
SEED_SECRET=secreto-largo
NEXT_PUBLIC_SERVER_URL=https://fabrickbuild.vercel.app
ADMIN_EMAIL=correo-del-administrador
ADMIN_PASSWORD=contraseña-del-administrador
BLOB_READ_WRITE_TOKEN=token-de-vercel-blob
```

La integración actual de Blob también puede crear el token con este nombre:

```env
BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN=...
```

FabrickBuild reconoce ambos nombres.

## Comandos

```bash
npm run dev
npm run build
npm run bootstrap:auto
npm run generate:types
npm run generate:importmap
```

`npm run build` ejecuta primero `bootstrap:auto` y después `next build`. Si la verificación crítica falla, el deployment se detiene y no publica una versión incompleta.

## Instalador web

La ruta `/instalar` se mantiene como consola visual protegida. Después de completarse la instalación, el estado persistido impide volver a ejecutarla.

## Panel

```text
/admin
```

El acceso utiliza los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados en Vercel.

## Advertencias no bloqueantes

- Neon puede mostrar una advertencia sobre la futura semántica de `sslmode`; para eliminarla puede usarse una URL con `sslmode=verify-full`.
- Sin un adaptador de correo, Payload escribe en consola los correos de recuperación. Esto no afecta el inicio de sesión normal.
