'use client'

export function PrivacySettingsButton({ label = 'Preferencias de privacidad' }: { label?: string }) {
  return (
    <button
      type="button"
      className="privacy-settings-trigger"
      onClick={() => window.dispatchEvent(new CustomEvent('fabrick:privacy-settings'))}
    >
      {label}
    </button>
  )
}
