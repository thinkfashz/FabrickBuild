# Secuencia cinematográfica FabrickBuild

Esta carpeta recibe los frames optimizados de la experiencia de lujo.

## Estructura requerida

```text
public/frames/luxury/
├── desktop/
│   ├── frame_001.webp
│   ├── ...
│   └── frame_021.webp
└── mobile/
    ├── frame_001.webp
    ├── ...
    └── frame_020.webp
```

## Resoluciones

- Escritorio: 1280 × 720 px.
- Móvil: 720 × 1280 px.

## Optimización aplicada

- Formato WebP.
- Calidad 88.
- Resolución original conservada.
- Todos los archivos pesan menos de 200 KB.
- Mayor archivo de escritorio: aproximadamente 82 KB.
- Mayor archivo móvil: aproximadamente 63 KB.

El componente `LuxuryScrollExperience` selecciona automáticamente la secuencia correspondiente según el tamaño y orientación de la pantalla.
