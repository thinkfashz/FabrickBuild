import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'
import { slugField } from '@/fields/slug'
import { seoFields } from '@/fields/seo'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Producto', plural: 'Productos' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Comercio',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'pricing.currentPrice', 'inventory.available', '_status', 'updatedAt'],
    description: 'Ficha de producto completa: fotos, características, precios, oferta, IVA, entrega y valoración.',
  },
  versions: {
    drafts: { autosave: { interval: 800 }, schedulePublish: true },
    maxPerDoc: 50,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Producto',
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Nombre del producto' },
            { name: 'shortDescription', type: 'textarea', label: 'Descripción corta', maxLength: 280 },
            { name: 'description', type: 'richText', label: 'Descripción completa' },
            {
              type: 'row',
              fields: [
                { name: 'sku', type: 'text', label: 'SKU / referencia', index: true },
                { name: 'brand', type: 'text', label: 'Marca' },
                { name: 'category', type: 'text', label: 'Categoría', index: true },
              ],
            },
            {
              name: 'features',
              type: 'array',
              labels: { singular: 'Característica', plural: 'Características' },
              admin: { description: 'Especificaciones que se mostrarán como beneficios o ficha técnica.' },
              fields: [
                { name: 'label', type: 'text', required: true, label: 'Nombre' },
                { name: 'value', type: 'text', required: true, label: 'Valor' },
                { name: 'icon', type: 'select', defaultValue: 'check', label: 'Ícono', options: [{ label: 'Check', value: 'check' }, { label: 'Rayo', value: 'bolt' }, { label: 'Garantía', value: 'shield' }, { label: 'Envío', value: 'truck' }] },
              ],
            },
          ],
        },
        {
          label: 'Fotos y multimedia',
          fields: [
            {
              name: 'cover',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen principal',
              admin: { description: 'Selecciona un archivo ya guardado en Biblioteca multimedia o súbelo desde la relación.' },
            },
            {
              name: 'gallery',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              label: 'Galería',
              admin: { description: 'Ordena las fotos como quieres que aparezcan en la ficha.' },
            },
          ],
        },
        {
          label: 'Precio, IVA y oferta',
          fields: [
            {
              name: 'pricing',
              type: 'group',
              label: 'Precio',
              fields: [
                { name: 'currency', type: 'select', defaultValue: 'CLP', options: [{ label: 'Peso chileno (CLP)', value: 'CLP' }, { label: 'Dólar (USD)', value: 'USD' }] },
                { name: 'regularPrice', type: 'number', min: 0, label: 'Precio anterior / lista' },
                { name: 'currentPrice', type: 'number', min: 0, required: true, label: 'Precio actual' },
                { name: 'offerLabel', type: 'text', label: 'Etiqueta de oferta', defaultValue: 'Oferta especial' },
                { name: 'offerEndsAt', type: 'date', label: 'Fin de la oferta', admin: { date: { pickerAppearance: 'dayAndTime' } } },
                { name: 'taxRate', type: 'number', min: 0, max: 100, defaultValue: 19, label: 'IVA (%)' },
                { name: 'taxIncluded', type: 'checkbox', defaultValue: true, label: 'El precio incluye IVA' },
              ],
            },
          ],
        },
        {
          label: 'Entrega e inventario',
          fields: [
            {
              name: 'inventory',
              type: 'group',
              fields: [
                { name: 'available', type: 'checkbox', defaultValue: true, label: 'Disponible para venta' },
                { name: 'stock', type: 'number', min: 0, label: 'Unidades disponibles' },
                { name: 'lowStockAt', type: 'number', min: 0, label: 'Avisar stock bajo desde' },
              ],
            },
            {
              name: 'shipping',
              type: 'group',
              fields: [
                { name: 'days', type: 'number', min: 0, label: 'Días estimados de envío' },
                { name: 'cost', type: 'number', min: 0, label: 'Costo de despacho' },
                { name: 'notes', type: 'textarea', label: 'Detalle de entrega', defaultValue: 'La fecha final se confirma antes de enviar.' },
              ],
            },
            {
              name: 'rating',
              type: 'group',
              label: 'Puntuación',
              fields: [
                { name: 'value', type: 'number', min: 0, max: 5, defaultValue: 5, label: 'Promedio (0 a 5)' },
                { name: 'reviewCount', type: 'number', min: 0, defaultValue: 0, label: 'Cantidad de reseñas' },
              ],
            },
          ],
        },
        { label: 'SEO', fields: [seoFields] },
      ],
    },
    slugField(),
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
