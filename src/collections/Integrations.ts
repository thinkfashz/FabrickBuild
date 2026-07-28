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

const hiddenSecretAccess = {
  read: () => false,
  create: () => false,
  update: () => false,
}

export const Integrations: CollectionConfig = {
  slug: 'integrations',
  labels: { singular: 'Integración', plural: 'Integraciones' },
  admin: {
    group: 'IA y automatización',
    useAsTitle: 'label',
    defaultColumns: ['label', 'provider', 'status', 'defaultModel', 'lastConnectedAt'],
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
    {
      name: 'connectionMode',
      type: 'select',
      defaultValue: 'automatic',
      options: [
        { label: 'Automática', value: 'automatic' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    { name: 'baseURL', type: 'text' },
    { name: 'defaultModel', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'untested',
      options: [
        { label: 'Sin probar', value: 'untested' },
        { label: 'Conectando', value: 'connecting' },
        { label: 'Conectada', value: 'connected' },
        { label: 'Bloqueada', value: 'locked' },
        { label: 'Error', value: 'error' },
        { label: 'Desactivada', value: 'disabled' },
      ],
    },
    { name: 'credentialHint', type: 'text', admin: { readOnly: true } },
    { name: 'credentialFingerprint', type: 'text', admin: { readOnly: true } },
    { name: 'credentialKeyVersion', type: 'number', defaultValue: 2, admin: { readOnly: true } },
    { name: 'secretUpdatedAt', type: 'date', admin: { readOnly: true } },
    { name: 'expiresAt', type: 'date' },
    { name: 'lastConnectedAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastTestedAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastUsedAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastError', type: 'textarea', admin: { readOnly: true } },
    { name: 'models', type: 'json', admin: { readOnly: true } },
    { name: 'capabilities', type: 'json', admin: { readOnly: true } },
    { name: 'usage', type: 'json', admin: { readOnly: true } },
    { name: 'lastTestUsage', type: 'json', admin: { readOnly: true } },
    { name: 'failedConnectionAttempts', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'lockedUntil', type: 'date', admin: { readOnly: true } },
    {
      name: 'encryptedCredentials',
      type: 'textarea',
      access: hiddenSecretAccess,
      admin: { hidden: true },
    },
    {
      name: 'credentialIV',
      type: 'text',
      access: hiddenSecretAccess,
      admin: { hidden: true },
    },
    {
      name: 'credentialTag',
      type: 'text',
      access: hiddenSecretAccess,
      admin: { hidden: true },
    },
    {
      name: 'credentialBinding',
      type: 'text',
      access: hiddenSecretAccess,
      admin: { hidden: true },
    },
  ],
  timestamps: true,
}
