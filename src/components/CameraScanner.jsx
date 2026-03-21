import { useCallback, useEffect, useRef, useState, startTransition } from 'react'
import {
  BrowserMultiFormatReader,
  BrowserCodeReader,
} from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const SCAN_TIPS = [
  'Pulse «Capturar foto» cuando el código esté nítido: suele leer mejor que en video en vivo.',
  'Mantenga el carnet firme, paralelo a la cámara y con buena luz.',
  'Aleje o acerque hasta que las barras ocupen buena parte del recuadro.',
  'Evite reflejos en el plástico; incline un poco el carnet si hace falta.',
  'Si no lee, escriba el número del código y pulse Continuar (con o sin foto guardada).',
]

/** Más formatos + TRY_HARDER: carnets y libros varían mucho entre instituciones */
const BARCODE_HINTS = new Map([
  [DecodeHintType.TRY_HARDER, true],
  [
    DecodeHintType.POSSIBLE_FORMAT,
    [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ],
  ],
])

const VIDEO_CONSTRAINTS = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1920, min: 480 },
    height: { ideal: 1080, min: 360 },
  },
}

/** JPEG en algunos navegadores falla con dimensiones impares */
function evenDimension(n) {
  const x = Math.floor(Number(n)) || 0
  if (x < 2) return 2
  return x - (x % 2)
}

/**
 * Edge suele fallar con canvas.toBlob desde video HD; el driver entrega JPEG con takePhoto().
 */
async function blobViaImageCapture(video) {
  const stream = video?.srcObject
  if (!(stream instanceof MediaStream)) return null
  const track = stream.getVideoTracks()[0]
  if (!track || track.readyState !== 'live') return null
  if (typeof ImageCapture === 'undefined') return null

  try {
    const ic = new ImageCapture(track)
    const b = await ic.takePhoto()
    if (b?.size > 0) return b
  } catch {
    /* cámara sin takePhoto o error del driver */
  }

  try {
    const ic = new ImageCapture(track)
    const bmp = await ic.grabFrame()
    const w0 = bmp.width
    const h0 = bmp.height
    const max = 1280
    const scale =
      w0 > max || h0 > max ? Math.min(max / w0, max / h0, 1) : 1
    const w = evenDimension(Math.round(w0 * scale))
    const h = evenDimension(Math.round(h0 * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const cctx = c.getContext('2d')
    if (!cctx) {
      bmp.close()
      return null
    }
    cctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return await canvasToBlob(c, 0.88)
  } catch {
    return null
  }
}

async function decodeTextFromImageBlob(reader, blob) {
  if (!blob || !reader) return null
  const url = URL.createObjectURL(blob)
  try {
    const result = await reader.decodeFromImageUrl(url)
    const t = result?.getText?.()
    return t || null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Convierte el canvas a Blob en el navegador (no llama al servidor).
 * Algunos entornos devuelven null con JPEG o canvas muy grandes; probamos alternativas.
 */
async function canvasToBlob(canvas, jpegQuality = 0.92) {
  if (!canvas?.width || !canvas?.height) {
    throw new Error('Dimensiones de imagen inválidas.')
  }

  const tryToBlob = (type, q) =>
    new Promise((resolve) => {
      try {
        if (type === 'image/png') {
          canvas.toBlob((b) => resolve(b), type)
        } else {
          canvas.toBlob((b) => resolve(b), type, q)
        }
      } catch {
        resolve(null)
      }
    })

  const tryEncode = async (c) => {
    let blob = await tryToBlob('image/jpeg', jpegQuality)
    if (blob?.size) return blob
    blob = await tryToBlob('image/jpeg', 0.75)
    if (blob?.size) return blob
    blob = await tryToBlob('image/png')
    if (blob?.size) return blob

    try {
      const dataUrl = c.toDataURL('image/jpeg', jpegQuality)
      if (dataUrl?.startsWith('data:')) {
        const b = await (await fetch(dataUrl)).blob()
        if (b?.size) return b
      }
    } catch {
      /* seguir */
    }
    try {
      const dataUrl = c.toDataURL('image/png')
      if (dataUrl?.startsWith('data:')) {
        const b = await (await fetch(dataUrl)).blob()
        if (b?.size) return b
      }
    } catch {
      /* seguir */
    }
    return null
  }

  let blob = await tryEncode(canvas)
  if (blob) return blob

  const w = canvas.width
  const h = canvas.height
  if (w > 1920 || h > 1920) {
    const scale = Math.min(1920 / w, 1920 / h, 1)
    const sw = Math.max(1, Math.round(w * scale))
    const sh = Math.max(1, Math.round(h * scale))
    const small = document.createElement('canvas')
    small.width = sw
    small.height = sh
    const sctx = small.getContext('2d')
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, sw, sh)
      blob = await tryEncode(small)
      if (blob) return blob
    }
  }

  throw new Error('CANVAS_BLOB_FAILED')
}

async function captureFrameBlob(video) {
  const w0 = video.videoWidth
  const h0 = video.videoHeight
  if (!w0 || !h0) {
    throw new Error('La cámara aún no está lista; intente de nuevo.')
  }

  const fromIc = await blobViaImageCapture(video)
  if (fromIc) return fromIc

  const w = evenDimension(w0)
  const h = evenDimension(h0)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la imagen.')
  ctx.drawImage(video, 0, 0, w, h)
  return canvasToBlob(canvas, 0.92)
}

async function manualPlaceholderBlob(codigo) {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 480
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la imagen.')
  ctx.fillStyle = '#f4f4f5'
  ctx.fillRect(0, 0, 640, 480)
  ctx.fillStyle = '#374151'
  ctx.font = '20px system-ui, sans-serif'
  ctx.fillText('Entrada manual (sin foto de cámara)', 24, 44)
  ctx.font = '18px ui-monospace, monospace'
  const line = codigo.trim().slice(0, 64)
  ctx.fillText(line || '(vacío)', 24, 88)
  return canvasToBlob(c, 0.85)
}

function stopCamera(videoEl) {
  BrowserCodeReader.releaseAllStreams()
  if (videoEl) BrowserCodeReader.cleanVideoSource(videoEl)
}

async function attachReaderStream(reader, video, callback) {
  try {
    return await reader.decodeFromConstraints(VIDEO_CONSTRAINTS, video, callback)
  } catch {
    return reader.decodeFromVideoDevice(undefined, video, callback)
  }
}

/**
 * @param {{
 *   title: string,
 *   instruction: string,
 *   onCapture: (p: { barcodeText: string, imageBlob: Blob }) => void,
 *   busy?: boolean,
 *   showManualEntry?: boolean,
 * }} props
 */
export function CameraScanner({
  title,
  instruction,
  onCapture,
  busy = false,
  showManualEntry = true,
}) {
  const videoRef = useRef(null)
  const onCaptureRef = useRef(onCapture)
  const lockedRef = useRef(false)
  const scanControlsRef = useRef(null)
  const readerRef = useRef(null)
  const restartDecodeRef = useRef(async () => {})

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [lastRead, setLastRead] = useState('')
  const [tipIdx, setTipIdx] = useState(0)
  const [manualCode, setManualCode] = useState('')
  const [stalePhotoBlob, setStalePhotoBlob] = useState(null)
  const [shutterHint, setShutterHint] = useState('')
  const [shutterBusy, setShutterBusy] = useState(false)
  /** Mensaje inmediato al pulsar capturar (éxito/error de lectura en foto) */
  const [shutterStatus, setShutterStatus] = useState('')

  useEffect(() => {
    onCaptureRef.current = onCapture
  }, [onCapture])

  useEffect(() => {
    if (phase !== 'scanning') return
    const id = window.setInterval(
      () => setTipIdx((i) => (i + 1) % SCAN_TIPS.length),
      4500,
    )
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (busy) return

    const hostVideo = videoRef.current
    let cancelled = false
    lockedRef.current = false
    startTransition(() => {
      setCameraReady(false)
      setLastRead('')
      setTipIdx(0)
      setStalePhotoBlob(null)
      setShutterHint('')
      setShutterStatus('')
      setPhase('starting')
      setError('')
    })

    const reader = new BrowserMultiFormatReader(BARCODE_HINTS)
    readerRef.current = reader

    async function handleDecoded(text, controls) {
      try {
        await new Promise((r) => requestAnimationFrame(r))
        const v = videoRef.current
        const blob = await captureFrameBlob(v)
        if (cancelled) return
        controls.stop()
        scanControlsRef.current = null
        stopCamera(v)
        setStalePhotoBlob(null)
        setShutterHint('')
        setPhase('done')
        onCaptureRef.current({ barcodeText: text, imageBlob: blob })
      } catch (e) {
        setShutterHint('')
        controls.stop()
        scanControlsRef.current = null
        stopCamera(videoRef.current)
        if (cancelled) return
        lockedRef.current = false
        setPhase('error')
        setError(
          e?.message ||
            'Se leyó el código pero falló la foto. Reintente o use entrada manual.',
        )
      }
    }

    const streamCallback = (result, _err, controls) => {
      if (cancelled || !result || lockedRef.current) return
      lockedRef.current = true
      const text = result.getText()
      if (!text) {
        lockedRef.current = false
        return
      }
      setLastRead(text)
      setPhase('detected')
      void handleDecoded(text, controls)
    }

    restartDecodeRef.current = async () => {
      if (cancelled || lockedRef.current) return false
      const video = videoRef.current
      if (!video) return false
      scanControlsRef.current?.stop()
      scanControlsRef.current = null
      await new Promise((r) => window.setTimeout(r, 120))
      try {
        const ctrl = await attachReaderStream(reader, video, streamCallback)
        if (cancelled) {
          ctrl?.stop()
          return false
        }
        scanControlsRef.current = ctrl
        return true
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[CameraScanner] No se pudo reanudar el escaneo', e)
        }
        return false
      }
    }

    async function boot() {
      const video = videoRef.current
      if (!video || cancelled) return

      setPhase('scanning')

      try {
        const ctrl = await attachReaderStream(reader, video, streamCallback)
        if (cancelled) {
          ctrl?.stop()
          return
        }
        scanControlsRef.current = ctrl
      } catch (e) {
        if (cancelled) return
        stopCamera(videoRef.current)
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Permita el acceso a la cámara para continuar.'
            : e?.message ||
              'No se pudo abrir la cámara. Compruebe permisos y que no la use otra app.'
        setError(msg)
        setPhase('error')
      }
    }

    const startId = window.setTimeout(() => {
      if (!cancelled) void boot()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(startId)
      readerRef.current = null
      restartDecodeRef.current = async () => {}
      scanControlsRef.current?.stop()
      scanControlsRef.current = null
      stopCamera(hostVideo)
    }
  }, [busy])

  const handleManualShutter = useCallback(async () => {
    if (busy || lockedRef.current) {
      setShutterStatus(
        busy
          ? 'Espere a que termine la petición al servidor.'
          : 'Ya hay una lectura en curso.',
      )
      return
    }
    if (shutterBusy) return

    const video = videoRef.current
    const reader = readerRef.current

    if (!reader) {
      setShutterStatus('El lector aún no está listo; espere un segundo e intente de nuevo.')
      return
    }
    if (!video) {
      setShutterStatus('No hay vista de cámara.')
      return
    }

    const hasFrame =
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth >= 8

    if (!hasFrame) {
      setShutterStatus(
        'La imagen aún no está lista (sin fotogramas). Espere a ver el video nítido y pulse de nuevo.',
      )
      return
    }

    setShutterBusy(true)
    setShutterHint('')
    setError('')

    scanControlsRef.current?.stop()
    scanControlsRef.current = null

    await new Promise((r) => requestAnimationFrame(r))

    setShutterStatus(
      'Capturando foto (usa la cámara del sistema en Edge; evita fallos del lienzo)…',
    )

    let blob = await blobViaImageCapture(video)
    let text = null

    if (blob) {
      setShutterStatus('Buscando código de barras en la foto…')
      text = await decodeTextFromImageBlob(reader, blob)
    }

    if (blob && text) {
      lockedRef.current = true
      setLastRead(text)
      setStalePhotoBlob(null)
      setShutterStatus('Código leído correctamente.')
      setPhase('detected')
      stopCamera(video)
      setPhase('done')
      onCaptureRef.current({ barcodeText: text, imageBlob: blob })
      setShutterBusy(false)
      return
    }

    if (blob && !text) {
      setStalePhotoBlob(blob)
      setShutterStatus('')
      setShutterHint(
        'Foto tomada con la cámara, pero no se leyó el código. Escriba el número abajo y pulse Continuar (se enviará esta imagen), o pulse «Otra foto».',
      )
      setPhase('scanning')
      const ok = await restartDecodeRef.current()
      if (!ok) {
        setError(
          'Foto guardada, pero la cámara no se reactivó. Pulse «Continuar» con el código escrito, o recargue la página.',
        )
      }
      setShutterBusy(false)
      return
    }

    const ew = evenDimension(video.videoWidth)
    const eh = evenDimension(video.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = ew
    canvas.height = eh
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setShutterStatus('No se pudo preparar la imagen en este dispositivo.')
      setShutterBusy(false)
      await restartDecodeRef.current()
      return
    }
    ctx.drawImage(video, 0, 0, ew, eh)

    try {
      blob = await canvasToBlob(canvas, 0.95)
    } catch (e) {
      const isBrowser =
        e?.message === 'CANVAS_BLOB_FAILED' ||
        e?.message === 'Dimensiones de imagen inválidas.' ||
        e?.message === 'No se pudo preparar la imagen.'
      setShutterStatus(
        isBrowser
          ? 'Edge no pudo generar el archivo desde el lienzo. Actualice Edge, desactive ahorro extremo de energía para este sitio, o escriba el código abajo y pulse Continuar.'
          : 'No se pudo guardar la imagen. Intente de nuevo o use el teclado.',
      )
      setShutterBusy(false)
      const ok = await restartDecodeRef.current()
      if (!ok)
        setError('No se pudo reactivar la cámara. Pulse «Reintentar escaneo».')
      return
    }

    setShutterStatus('Buscando código de barras en la foto…')

    try {
      const result = reader.decodeFromCanvas(canvas)
      const decoded = result.getText()
      if (!decoded) throw new Error('empty')
      lockedRef.current = true
      setLastRead(decoded)
      setStalePhotoBlob(null)
      setShutterStatus('Código leído correctamente.')
      setPhase('detected')
      stopCamera(video)
      setPhase('done')
      onCaptureRef.current({ barcodeText: decoded, imageBlob: blob })
    } catch {
      setStalePhotoBlob(blob)
      setShutterStatus('')
      setShutterHint(
        'No se leyó el código en esta foto. Escriba el número abajo y pulse Continuar (se enviará esta imagen), o pulse «Otra foto».',
      )
      setPhase('scanning')
      const ok = await restartDecodeRef.current()
      if (!ok) {
        setError(
          'Foto guardada, pero la cámara no se reactivó. Pulse «Continuar» con el código escrito, o recargue la página.',
        )
      }
    } finally {
      setShutterBusy(false)
    }
  }, [busy, shutterBusy])

  const discardStalePhoto = useCallback(async () => {
    setStalePhotoBlob(null)
    setShutterHint('')
    setShutterStatus('')
    const ok = await restartDecodeRef.current()
    if (!ok)
      setError('No se pudo reactivar la cámara. Use «Reintentar escaneo».')
  }, [])

  async function submitManual() {
    const code = manualCode.trim()
    if (!code || busy || lockedRef.current) return
    lockedRef.current = true
    scanControlsRef.current?.stop()
    scanControlsRef.current = null
    const v = videoRef.current
    setError('')
    setPhase('detected')
    setLastRead(code)
    setShutterHint('')
    setShutterStatus('')
    try {
      let blob
      if (stalePhotoBlob) {
        blob = stalePhotoBlob
        setStalePhotoBlob(null)
      } else if (v?.srcObject && v.videoWidth > 0) {
        blob = await captureFrameBlob(v)
      } else {
        blob = await manualPlaceholderBlob(code)
      }
      stopCamera(v)
      setPhase('done')
      onCaptureRef.current({ barcodeText: code, imageBlob: blob })
    } catch (e) {
      lockedRef.current = false
      setPhase('error')
      setError(e?.message || 'No se pudo enviar el código manual.')
    }
  }

  const showOverlay = phase === 'scanning' || phase === 'detected'
  const scanning = phase === 'scanning'
  /** No usar lockedRef aquí: no provoca re-render y el botón podría quedar oculto de forma incoherente */
  const showShutter = scanning && cameraReady && !busy

  return (
    <div className="camera-scanner">
      <h2 className="camera-scanner__title">{title}</h2>
      <p className="camera-scanner__hint">{instruction}</p>

      <div className="camera-scanner__toolbar" aria-live="polite">
        {phase === 'starting' && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Iniciando cámara…
          </span>
        )}
        {scanning && !cameraReady && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Esperando imagen de la cámara…
          </span>
        )}
        {scanning && cameraReady && shutterBusy && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Procesando captura…
          </span>
        )}
        {scanning && cameraReady && !shutterBusy && (
          <span className="camera-scanner__pill camera-scanner__pill--live">
            <span className="camera-scanner__dot" aria-hidden />
            Escaneando — o capture usted la foto
          </span>
        )}
        {phase === 'detected' && (
          <span className="camera-scanner__pill camera-scanner__pill--ok">
            Código detectado — capturando foto…
          </span>
        )}
        {phase === 'done' && (
          <span className="camera-scanner__pill camera-scanner__pill--ok">
            Listo — enviando al servidor…
          </span>
        )}
      </div>

      <div className="camera-scanner__frame">
        <video
          ref={videoRef}
          className="camera-scanner__video"
          playsInline
          muted
          aria-label="Vista de cámara para escanear código"
          onLoadedData={() => setCameraReady(true)}
          onPlaying={() => setCameraReady(true)}
        />
        {showOverlay && (
          <div className="camera-scanner__overlay" aria-hidden>
            <span className="camera-scanner__corners" />
            {scanning && <span className="camera-scanner__scanline" />}
          </div>
        )}
      </div>

      {showShutter && (
        <div className="camera-scanner__shutter-row">
          <button
            type="button"
            className="btn btn--primary camera-scanner__shutter-btn"
            disabled={shutterBusy}
            aria-busy={shutterBusy}
            onClick={() => void handleManualShutter()}
          >
            {shutterBusy ? 'Procesando…' : 'Capturar foto y leer código'}
          </button>
          <p className="camera-scanner__shutter-help">
            Congela el fotograma cuando vea el código nítido; muchas veces lee mejor
            que el video en movimiento.
          </p>
        </div>
      )}

      {stalePhotoBlob && scanning && (
        <div className="camera-scanner__stale-banner" role="status">
          <strong>Foto guardada.</strong> Escriba el código y pulse Continuar, o descarte
          para seguir probando.
          <button
            type="button"
            className="btn btn--ghost camera-scanner__stale-discard"
            onClick={() => void discardStalePhoto()}
          >
            Otra foto
          </button>
        </div>
      )}

      {shutterStatus && (
        <p className="camera-scanner__shutter-status" role="status" aria-live="polite">
          {shutterStatus}
        </p>
      )}

      {shutterHint && (
        <p className="camera-scanner__shutter-hint" role="status">
          {shutterHint}
        </p>
      )}

      {scanning && (
        <p className="camera-scanner__tips">
          <span className="camera-scanner__tips-label">Sugerencia: </span>
          {SCAN_TIPS[tipIdx]}
        </p>
      )}

      {lastRead && (phase === 'detected' || phase === 'done') && (
        <p className="camera-scanner__readout" aria-live="assertive">
          <span className="camera-scanner__readout-label">Leído: </span>
          <code className="camera-scanner__readout-code">{lastRead}</code>
        </p>
      )}

      {error && (
        <p className="camera-scanner__status camera-scanner__status--err" role="alert">
          {error}
        </p>
      )}

      {showManualEntry && (phase === 'scanning' || phase === 'error') && (
        <div className="camera-scanner__manual">
          <p className="camera-scanner__manual-title">¿No lo lee la cámara?</p>
          <label className="camera-scanner__manual-label" htmlFor="manual-barcode">
            Escriba el número del código de barras
          </label>
          <div className="camera-scanner__manual-row">
            <input
              id="manual-barcode"
              type="text"
              className="camera-scanner__manual-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ej. números bajo las barras"
              autoComplete="off"
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn--secondary camera-scanner__manual-btn"
              disabled={busy || !manualCode.trim()}
              onClick={() => void submitManual()}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
