# Componentes generados

Esta carpeta contiene el límite de renderizado para componentes creados o ensamblados desde FabrickBuild AI Studio.

Los componentes reutilizables no escriben código arbitrario en el sistema de archivos de Vercel. Su estructura, estilos aislados y versiones se guardan en la colección `reusable-components` de PostgreSQL. El código de esta carpeta valida y representa esos componentes dentro de las páginas de Payload.

Reglas:

- Solo se aceptan bloques registrados por FabrickBuild.
- El CSS queda aislado por `data-component`.
- No se ejecutan scripts, iframes, formularios HTML ni recursos remotos generados por IA.
- Cada componente puede reutilizarse mediante el bloque `reusableComponent`.
