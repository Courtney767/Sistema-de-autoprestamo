/**
 * Mensajes cortos para la pantalla (sin detalle técnico).
 */
export function endUserCameraErrorMessage(error) {
  const name = error?.name
  if (name === 'NotAllowedError') {
    return 'No pudimos usar la cámara. Permita el acceso cuando el navegador lo solicite o revise los permisos de este sitio.'
  }
  if (name === 'NotFoundError') {
    return 'No encontramos una cámara en este equipo. Compruebe la conexión y vuelva a intentar.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La cámara no está disponible en este momento. Cierre otras aplicaciones que puedan usarla y vuelva a intentar.'
  }
  if (name === 'SecurityError' || name === 'NotSupportedError') {
    return 'Su navegador no permite usar la cámara de esta forma. Pruebe otra dirección de acceso o pida ayuda al personal del servicio.'
  }
  if (name === 'OverconstrainedError') {
    return 'No pudimos preparar la imagen de la cámara. Vuelva a intentar o use la opción de introducción manual.'
  }
  return 'No pudimos abrir la cámara. Vuelva a intentar más tarde o use la opción de introducción manual.'
}

function snapshotMediaDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return Promise.resolve({ enumerateDevices: 'no disponible' })
  }
  return navigator.mediaDevices.enumerateDevices().then((list) => ({
    total: list.length,
    videoinput: list.filter((d) => d.kind === 'videoinput').length,
    devices: list.map((d) => ({
      kind: d.kind,
      label: d.label || '(vacío hasta que haya permiso de cámara/micrófono)',
      deviceId: d.deviceId || '(vacío)',
      groupId: d.groupId || '',
    })),
  }))
}

/**
 * Registra en consola todo lo útil para soporte (no mostrar en pantalla).
 */
export async function logMediaDiagnostic(error, extra = {}) {
  const base = {
    ...extra,
    errorName: error?.name,
    errorMessage: error?.message,
    stack: error?.stack,
    isSecureContext:
      typeof globalThis !== 'undefined' ? globalThis.isSecureContext : undefined,
    href: typeof location !== 'undefined' ? location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    hasMediaDevices: !!(typeof navigator !== 'undefined' && navigator.mediaDevices),
    hasGetUserMedia: !!(
      typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
    ),
  }
  try {
    base.mediaDevices = await snapshotMediaDevices()
  } catch (e) {
    base.mediaDevices = { error: String(e), name: e?.name }
  }
  console.error('[Sistema] Fallo de cámara o imagen (detalle técnico)', base)
}

const PROBE_CONSTRAINTS = [
  ['ideal móvil + HD', { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920, min: 480 }, height: { ideal: 1080, min: 360 } } }],
  ['solo video true', { video: true }],
  ['720p ideal sin facingMode', { video: { width: { ideal: 1280 }, height: { ideal: 720 } } }],
]

/**
 * Ejecutar en la consola del dispositivo: await __SISTEMA_CAMERA_DEBUG__.probe()
 * Activo con ?cameraDebug=1 o en modo desarrollo (ver main.jsx).
 */
export async function probeCameraInConsole() {
  const report = {
    isSecureContext: globalThis.isSecureContext,
    href: location.href,
    userAgent: navigator.userAgent,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    enumerateBefore: await snapshotMediaDevices(),
    getUserMediaAttempts: [],
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn('[Sistema cámara] probe', report)
    console.warn('getUserMedia no está disponible (¿contexto no seguro?)')
    return report
  }

  for (const [label, constraints] of PROBE_CONSTRAINTS) {
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings?.() ?? {}
      report.getUserMediaAttempts.push({
        label,
        constraints,
        ok: true,
        trackLabel: track?.label,
        settings,
      })
      for (const t of stream.getTracks()) t.stop()
    } catch (e) {
      report.getUserMediaAttempts.push({
        label,
        constraints,
        ok: false,
        errorName: e?.name,
        errorMessage: e?.message,
      })
    }
  }

  report.enumerateAfter = await snapshotMediaDevices()
  console.group('[Sistema cámara] Diagnóstico completo')
  console.log('Entorno', {
    isSecureContext: report.isSecureContext,
    href: report.href,
  })
  console.log('Dispositivos (antes de pruebas)', report.enumerateBefore)
  console.table(report.getUserMediaAttempts)
  console.log('Dispositivos (después de pruebas)', report.enumerateAfter)
  console.groupEnd()
  return report
}
