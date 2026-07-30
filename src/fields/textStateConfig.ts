/**
 * Shared by Payload's inline text toolbar and the public React renderer.
 * Keeping it dependency-free means content saved in Lexical renders the same
 * in the admin preview and on the published page.
 */
export const textStateConfig = {
  color: {
    ink: { label: 'Grafito', css: { color: '#171713' } },
    white: { label: 'Blanco', css: { color: '#ffffff' } },
    gold: { label: 'Dorado Fabrick', css: { color: '#f4c84b' } },
    orange: { label: 'Naranja', css: { color: '#e97835' } },
    blue: { label: 'Azul', css: { color: '#62d0ff' } },
    green: { label: 'Verde', css: { color: '#a4e454' } },
    muted: { label: 'Gris suave', css: { color: '#8d8a82' } },
  },
} as const
