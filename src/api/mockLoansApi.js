import { getMockScenario } from './mockConfig.js'

function checkAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = window.setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      resolve()
    }, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

/**
 * @param {{ imageBlob: Blob, codigoBarras: string, signal?: AbortSignal }} opts
 */
export async function mockValidarCarnet({
  imageBlob,
  codigoBarras,
  signal,
}) {
  const scenario = getMockScenario()
  await delay(650, signal)
  checkAborted(signal)

  console.info('[mock API] validar-carnet', {
    codigoBarras,
    fotoBytes: imageBlob?.size ?? 0,
    scenario,
  })

  switch (scenario) {
    case 'carnet_rechazado':
      return {
        valid: false,
        message:
          'Carnet no reconocido o vencido (respuesta simulada). Pruebe otro escenario en el panel.',
      }
    case 'carnet_error':
      throw new Error(
        'No se pudo contactar al servidor (simulado). Revise conexión o desactive el mock.',
      )
    case 'full_success':
    case 'libro_rechazado':
    case 'libro_error':
    default:
      return {
        valid: true,
        koha: {
          patronId: `MOCK-PATRON-${codigoBarras?.slice(0, 8) || 'demo'}`,
          sessionToken: 'mock-session-token-demo-dev-only',
          displayName: 'Estudiante de prueba (mock)',
        },
      }
  }
}

/**
 * @param {{ imageBlob: Blob, codigoBarras: string, sessionToken: string, signal?: AbortSignal }} opts
 */
export async function mockValidarLibro({
  imageBlob,
  codigoBarras,
  sessionToken,
  signal,
}) {
  const scenario = getMockScenario()
  await delay(720, signal)
  checkAborted(signal)

  console.info('[mock API] validar-libro', {
    codigoBarras,
    fotoBytes: imageBlob?.size ?? 0,
    sessionTokenPreview: sessionToken?.slice(0, 12) + '…',
    scenario,
  })

  switch (scenario) {
    case 'libro_rechazado':
      return {
        valid: false,
        message:
          'No se puede prestar: límite de 3 ejemplares o ejemplar no disponible (simulado).',
        libro: {
          titulo: `Ejemplar ${codigoBarras || '(sin código)'}`,
        },
      }
    case 'libro_error':
      throw new Error('Error al registrar el préstamo en Koha (simulado).')
    case 'full_success':
    case 'carnet_rechazado':
    case 'carnet_error':
    default:
      return {
        valid: true,
        message: 'Préstamo registrado correctamente (simulado).',
        libro: {
          titulo: 'Manual de usuario — Autopréstamos (mock)',
          itemNumber: codigoBarras || 'MOCK-ITEM',
        },
      }
  }
}
