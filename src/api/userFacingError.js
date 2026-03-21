/**
 * Convierte errores de fetch/API en textos claros para el kiosco.
 * @param {unknown} error — Típico `Error` lanzado por `loansApi` (`status`, `message`)
 * @param {'carnet' | 'libro'} kind
 * @returns {{ title: string, detail: string, codeLabel?: string }}
 */
export function getUserFacingApiError(error, kind) {
  const e = error && typeof error === 'object' ? error : {}
  const status = typeof e.status === 'number' ? e.status : undefined
  const raw = typeof e.message === 'string' ? e.message.trim() : ''

  const corto = 'Reintente o acérquese a biblioteca.'

  if (status === 502) {
    return {
      title: 'No hubo respuesta del servidor (502)',
      detail: `Fallo temporal al comunicarse con biblioteca. ${corto}`,
      codeLabel: '502',
    }
  }

  if (status === 503) {
    return {
      title: 'Servicio no disponible (503)',
      detail: `Servidor ocupado o en mantenimiento. ${corto}`,
      codeLabel: '503',
    }
  }

  if (status === 504) {
    return {
      title: 'Tiempo de espera agotado (504)',
      detail: `El servidor tardó demasiado. ${corto}`,
      codeLabel: '504',
    }
  }

  if (status != null && status >= 500) {
    return {
      title: 'Error en el servidor',
      detail: corto,
      codeLabel: String(status),
    }
  }

  if (status === 401 || status === 403) {
    return {
      title: 'Sesión no válida',
      detail:
        kind === 'libro'
          ? 'Vuelva atrás e identifíquese de nuevo con el carnet.'
          : 'Intente de nuevo o consulte en biblioteca.',
      codeLabel: status ? String(status) : undefined,
    }
  }

  if (status === 404) {
    return {
      title: 'Servicio no encontrado',
      detail: 'Avise a biblioteca o sistemas.',
      codeLabel: '404',
    }
  }

  if (
    raw &&
    (/failed to fetch/i.test(raw) ||
      /networkerror/i.test(raw) ||
      /load failed/i.test(raw) ||
      /network request failed/i.test(raw))
  ) {
    return {
      title: 'Sin conexión',
      detail: 'Revise la red e intente otra vez.',
    }
  }

  const fallbackTitle =
    kind === 'carnet'
      ? 'No se pudo verificar el carnet'
      : 'No se pudo registrar el préstamo'

  const isBareStatus = /^error\s+\d+$/i.test(raw)

  return {
    title: fallbackTitle,
    detail: raw && !isBareStatus ? raw : corto,
    codeLabel: status ? String(status) : undefined,
  }
}
