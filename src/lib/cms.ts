import config from '@payload-config'
import { getPayload } from 'payload'

const CMS_RETRY_ATTEMPTS = 3
const CMS_RETRY_DELAY_MS = 300

const transientDatabaseError =
  /cannot connect to postgres|connection terminated|connection timeout|timeout expired|econnreset|etimedout|57p01|57p02|57p03/i

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })

let payloadPromise: ReturnType<typeof getPayload> | null = null

function initialiseCMS() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config }).catch((error) => {
      // Payload can fail while Neon is waking up. Never keep a rejected
      // initialisation promise cached for the lifetime of the function.
      payloadPromise = null
      throw error
    })
  }

  return payloadPromise
}

export async function getCMS() {
  let lastError: unknown

  for (let attempt = 1; attempt <= CMS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await initialiseCMS()
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      const payloadInitError = Boolean(
        error &&
          typeof error === 'object' &&
          'payloadInitError' in error &&
          (error as { payloadInitError?: boolean }).payloadInitError,
      )
      const canRetry = payloadInitError || transientDatabaseError.test(message)

      if (!canRetry || attempt === CMS_RETRY_ATTEMPTS) throw error

      const delay = CMS_RETRY_DELAY_MS * attempt
      console.warn(
        `[database] Inicio de Payload interrumpido. Reintento ${attempt}/${CMS_RETRY_ATTEMPTS - 1} en ${delay} ms.`,
      )
      await wait(delay)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No fue posible iniciar Payload.')
}
