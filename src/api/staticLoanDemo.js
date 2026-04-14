/**
 * Demo estática para despliegues sin backend: carnet y libro por códigos conocidos.
 * Activa con VITE_STATIC_LOAN_DEMO=true en el build.
 */

export const STATIC_LOAN_DEMO_SESSION_TOKEN = 'static-loan-demo-session'

const DEMO_DISPLAY_NAME = 'COURTNEY L. VIZCAINO SANCHEZ'
const DEMO_PATRON_ID = 'A00110753'
const DEMO_MATRICULA = '20220723'

const DEMO_BOOK_TITLE = 'El Bosque Oscuro'
const DEMO_BOOK_ISBN_DIGITS = '9788413146454'

/** @param {string | undefined | null} raw */
function normalizeLoanDemoInput(raw) {
  if (raw == null) return ''
  return String(raw).trim()
}

/** Matrícula / ID carnet: sin espacios, comparación sin distinguir mayúsculas. */
function normalizeCarnetCode(raw) {
  return normalizeLoanDemoInput(raw).replace(/\s+/g, '').toUpperCase()
}

/** ISBN o código con guiones / espacios → cadena alfanumérica compacta (ISBN-13: dígitos). */
function normalizeBookCode(raw) {
  return normalizeLoanDemoInput(raw).replace(/[\s-]/g, '')
}

const ALLOWED_CARNET_CODES = new Set([
  normalizeCarnetCode(DEMO_MATRICULA),
  normalizeCarnetCode(DEMO_PATRON_ID),
])

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
 * @param {{ codigoBarras: string, signal?: AbortSignal }} opts
 */
export async function staticLoanDemoValidarCarnet({ codigoBarras, signal }) {
  await delay(520, signal)
  checkAborted(signal)

  const key = normalizeCarnetCode(codigoBarras)
  if (!key || !ALLOWED_CARNET_CODES.has(key)) {
    return {
      valid: false,
      message:
        'No encontramos un carnet vigente con esos datos. Revise la matrícula o el código del carnet e intente de nuevo.',
    }
  }

  return {
    valid: true,
    message: undefined,
    koha: {
      patronId: DEMO_PATRON_ID,
      sessionToken: STATIC_LOAN_DEMO_SESSION_TOKEN,
      displayName: DEMO_DISPLAY_NAME,
    },
  }
}

/**
 * @param {{ codigoBarras: string, sessionToken: string, signal?: AbortSignal }} opts
 */
export async function staticLoanDemoValidarLibro({
  codigoBarras,
  sessionToken,
  signal,
}) {
  await delay(560, signal)
  checkAborted(signal)

  if (sessionToken !== STATIC_LOAN_DEMO_SESSION_TOKEN) {
    return {
      valid: false,
      message:
        'Su sesión no es válida o ha expirado. Verifique el carnet e inicie de nuevo el proceso.',
    }
  }

  const digits = normalizeBookCode(codigoBarras)
  if (!digits || digits !== DEMO_BOOK_ISBN_DIGITS) {
    return {
      valid: false,
      message:
        'No se reconoce el ejemplar o no está disponible para préstamo. Revise el código de barras o el inventario e intente de nuevo.',
    }
  }

  return {
    valid: true,
    message: 'Préstamo registrado correctamente.',
    libro: {
      titulo: DEMO_BOOK_TITLE,
      itemNumber: DEMO_BOOK_ISBN_DIGITS,
    },
  }
}
