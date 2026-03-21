/**
 * Contrato esperado con el backend (Koha / capa intermedia).
 *
 * POST /api/prestamos/validar-carnet
 *   multipart: foto (image/jpeg), codigoBarras (texto leído del carnet, si aplica)
 *   200: { valid: boolean, message?: string, koha?: { patronId, sessionToken, displayName?, ... } }
 *
 * POST /api/prestamos/validar-libro
 *   headers: Authorization: Bearer <sessionToken> (o el esquema que defina tu API)
 *   multipart: foto, codigoBarras
 *   200: { valid: boolean, message?: string, libro?: { titulo?, itemNumber?, ... } }
 */

import { mockValidarCarnet, mockValidarLibro } from './mockLoansApi.js'
import { isMockApiEnabled } from './mockConfig.js'

function apiUrl(path) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (base) return `${base}${path}`
  return path
}

async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

/**
 * @param {{ imageBlob: Blob, codigoBarras: string, signal?: AbortSignal }} opts
 */
export async function validarCarnet({ imageBlob, codigoBarras, signal }) {
  if (isMockApiEnabled()) {
    return mockValidarCarnet({ imageBlob, codigoBarras, signal })
  }

  const fd = new FormData()
  fd.append('foto', imageBlob, 'carnet.jpg')
  fd.append('codigoBarras', codigoBarras)

  const res = await fetch(apiUrl('/api/prestamos/validar-carnet'), {
    method: 'POST',
    body: fd,
    signal,
  })

  const data = await parseJsonResponse(res)
  if (!res.ok) {
    const err = new Error(data.message || `Error ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

/**
 * @param {{ imageBlob: Blob, codigoBarras: string, sessionToken: string, signal?: AbortSignal }} opts
 */
export async function validarLibro({
  imageBlob,
  codigoBarras,
  sessionToken,
  signal,
}) {
  if (isMockApiEnabled()) {
    return mockValidarLibro({
      imageBlob,
      codigoBarras,
      sessionToken,
      signal,
    })
  }

  const fd = new FormData()
  fd.append('foto', imageBlob, 'libro.jpg')
  fd.append('codigoBarras', codigoBarras)

  const res = await fetch(apiUrl('/api/prestamos/validar-libro'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    body: fd,
    signal,
  })

  const data = await parseJsonResponse(res)
  if (!res.ok) {
    const err = new Error(data.message || `Error ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}
