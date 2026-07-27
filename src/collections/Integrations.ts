import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const integrationProviderOptions = [
  { label: 'Ollama Cloud', value: 'ollama' },
  { label: 'OpenAI / ChatGPT', value: 'openai' },
  { label: 'Anthropic / Claude Code', value: 'anthropic' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Z.AI / GLM', value: 'glm' },
  { label: 'OpenAI compatible / OpenCode', value: 'custom-openai' },
  { label: 'Resend', value: 'resend' },
  { label: 'Cloudinary', value: 'cloudinary' },
] as const

export const Integrations: CollectionConfig = {
  slug: 'integrations',
  labels: { singular: 'Integración', plural: 'Integraciones' },
  admin: {
    group: 'IA y automatización',
    useAsTitle: 'label',
    defaultColumns: ['label', 'provider', 'status', 'defaultModel', 'lastTestedAt'],
  },
  access: {
    admin: ({ req }) => req.user?.role === 'admin',
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: [...integrationProviderOptions],
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
    { name: 'priority', type: 'number', defaultValue: 100, min: 0 },
    { name: 'baseURL', type: 'text' },
    { name: 'defaultModel', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'untested',
      options: [
        { label: 'Sin probar', value: 'untested' },
        { label: 'Conectada', value: 'connected' },
        { label: 'Error', value: 'error' },
        { label: 'Desactivada', value: 'disabled' },
      ],
    },
    { name: 'credentialHint', type: 'text', admin: { readOnly: true } },
    { name: 'expiresAt', type: 'date' },
    { name: 'lastTestedAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastUsedAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastError', type: 'textarea', admin: { readOnly: true } },
    { name: 'models', type: 'json', admin: { readOnly: true } },
    { name: 'capabilities', type: 'json', admin: { readOnly: true } },
    { name: 'usage', type: 'json', admin: { readOnly: true } },
    {
      name: 'encryptedCredentials',
      type: 'textarea',
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'credentialIV',
      type: 'text',
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'credentialTag',
      type: 'text',
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
  timestamps: true,
}
