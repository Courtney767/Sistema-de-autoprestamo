import { useCallback, useEffect, useRef, useState, startTransition } from 'react'

const VIDEO_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920, min: 480 },
    height: { ideal: 1080, min: 360 },
  },
}

/** JPEG / canvas: algunos navegadores fallan con dimensiones impares */
function evenDimension(n) {
  const x = Math.floor(Number(n)) || 0
  if (x < 2) return 2
  return x - (x % 2)
}

async function openCameraStream() {
  const attempts = [
    () => navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS),
    () => navigator.mediaDevices.getUserMedia({ video: true }),
  ]
  let lastErr
  for (const fn of attempts) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

function stopCamera(videoEl) {
  const s = videoEl?.srcObject
  if (s instanceof MediaStream) {
    for (const t of s.getTracks()) t.stop()
  }
  if (videoEl) videoEl.srcObject = null
}

async function playVideo(video) {
  if (!video) return
  try {
    await video.play()
  } catch {
    /* política de autoplay: el usuario puede pulsar «Capturar» o recargar */
  }
}

/**
 * Edge suele fallar con canvas.toBlob desde video HD; el driver entrega PNG/JPEG con takePhoto().
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
  ctx.fillText('Registro manual (sin foto de cámara)', 24, 44)
  ctx.font = '18px ui-monospace, monospace'
  const line = codigo.trim().slice(0, 64)
  ctx.fillText(line || '(vacío)', 24, 88)
  return canvasToBlob(c, 0.85)
}

/** Consejos según paso del flujo (misma línea visual que sesión / resultado). */
const CONTEXT_TIPS = {
  carnet: [
    { head: 'Encuadre', body: 'Centre el carnet dentro del marco turquesa.' },
    { head: 'Luz', body: 'Evite sombras fuertes y reflejos en el plástico.' },
  ],
  libro: [
    { head: 'Código', body: 'Enfoque la etiqueta o el código del lomo o contraportada.' },
    { head: 'Nitidez', body: 'Si va borroso, use «Capturar y enviar foto».' },
  ],
}

function ScannerVisualBadge({ variant }) {
  const cls = 'camera-scanner__badge'
  if (variant === 'carnet') {
    return (
      <div className={cls} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="9" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M14 10h4M14 13h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }
  if (variant === 'libro') {
    return (
      <div className={cls} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <path
            d="M5 4h12a2 2 0 012 2v13a1 1 0 01-1 1H6a2 2 0 01-2-2V4z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M5 4v14a2 2 0 002 2h11"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M9 8h6M9 12h5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }
  return (
    <div className={`${cls} camera-scanner__badge--default`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
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

/**
 * @param {{
 *   title: string,
 *   instruction: string,
 *   onCapture: (p: { barcodeText: string, imageBlob: Blob }) => void,
 *   busy?: boolean,
 *   showManualEntry?: boolean,
 *   manualSectionTitle?: string,
 *   manualEntryLabel?: string,
 *   visualVariant?: 'carnet' | 'libro',
 * }} props
 */
export function CameraScanner({
  title,
  instruction,
  onCapture,
  busy = false,
  showManualEntry = true,
  manualSectionTitle = '¿Sin cámara o no se ve bien?',
  manualEntryLabel = 'Escriba el código y pulse Continuar',
  visualVariant,
}) {
  const videoRef = useRef(null)
  const onCaptureRef = useRef(onCapture)

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [captureBusy, setCaptureBusy] = useState(false)
  const [manualBusy, setManualBusy] = useState(false)
  const [statusLine, setStatusLine] = useState('')
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    onCaptureRef.current = onCapture
  }, [onCapture])

  useEffect(() => {
    if (busy) return

    let cancelled = false

    startTransition(() => {
      setCameraReady(false)
      setCaptureBusy(false)
      setManualBusy(false)
      setStatusLine('')
      setPhase('starting')
      setError('')
    })

    ;(async () => {
      try {
        const stream = await openCameraStream()
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        const video = videoRef.current
        if (!video) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        video.srcObject = stream
        await playVideo(video)
        if (cancelled) return
        setPhase('live')
      } catch (e) {
        if (cancelled) return
        stopCamera(videoRef.current)
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Permita el acceso a la cámara en el navegador.'
            : e?.message ||
              'No se pudo abrir la cámara. Revise permisos o cierre otras apps que la usen.'
        setError(msg)
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      stopCamera(videoRef.current)
    }
  }, [busy])

  const handleCapture = useCallback(async () => {
    if (busy || captureBusy) {
      setStatusLine(busy ? 'Espere a que termine el envío.' : 'Capturando…')
      return
    }
    const video = videoRef.current
    if (!video?.srcObject) {
      setStatusLine('Cámara no disponible.')
      return
    }
    const hasFrame =
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth >= 8
    if (!hasFrame) {
      setStatusLine('Espere a que se vea la imagen y vuelva a intentar.')
      return
    }

    setCaptureBusy(true)
    setStatusLine('')
    setError('')

    await new Promise((r) => requestAnimationFrame(r))

    try {
      const blob = await captureFrameBlob(video)
      if (!blob?.size) throw new Error('No se generó la imagen.')
      stopCamera(video)
      setPhase('done')
      onCaptureRef.current({ barcodeText: '', imageBlob: blob })
    } catch (e) {
      const isBrowser =
        e?.message === 'CANVAS_BLOB_FAILED' ||
        e?.message === 'Dimensiones de imagen inválidas.' ||
        e?.message === 'No se pudo preparar la imagen.'
      setError(
        isBrowser
          ? 'Este navegador no generó la imagen. Pruebe otro navegador o recargue.'
          : e?.message || 'No se pudo capturar la foto. Intente de nuevo.',
      )
    } finally {
      setCaptureBusy(false)
    }
  }, [busy, captureBusy])

  const submitManual = useCallback(async () => {
    const code = manualCode.trim()
    if (!code || busy || manualBusy || captureBusy) return
    setManualBusy(true)
    setError('')
    try {
      const video = videoRef.current
      let blob
      if (video?.srcObject && video.videoWidth > 0) {
        try {
          await playVideo(video)
          await new Promise((r) => requestAnimationFrame(r))
          blob = await captureFrameBlob(video)
        } catch {
          blob = await manualPlaceholderBlob(code)
        }
      } else {
        blob = await manualPlaceholderBlob(code)
      }
      stopCamera(videoRef.current)
      setPhase('done')
      onCaptureRef.current({ barcodeText: code, imageBlob: blob })
    } catch (e) {
      setError(e?.message || 'No se pudo enviar.')
    } finally {
      setManualBusy(false)
    }
  }, [busy, manualBusy, captureBusy, manualCode])

  const live = phase === 'live'
  const starting = phase === 'starting'
  const failedOpen = phase === 'error'
  const done = phase === 'done'
  const showCapture = live && cameraReady && !busy && !captureBusy && !manualBusy
  const showManual =
    showManualEntry && (live || failedOpen) && !done && !busy && !captureBusy

  const tips = visualVariant ? CONTEXT_TIPS[visualVariant] : null

  return (
    <div className="camera-scanner">
      <header className="camera-scanner__head">
        <ScannerVisualBadge variant={visualVariant} />
        <h2 className="camera-scanner__title">{title}</h2>
        <p className="camera-scanner__hint">{instruction}</p>
      </header>

      {tips ? (
        <ul className="camera-scanner__tips" aria-label="Consejos para esta captura">
          {tips.map((tip) => (
            <li key={tip.head} className="camera-scanner__tip">
              <span className="camera-scanner__tip-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path
                    d="M12 3v1M5.6 5.6l.7.7M3 12h1M5.6 18.4l.7-.7M12 21v-1M18.4 18.4l-.7-.7M21 12h-1M18.4 5.6l-.7.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span>
                <strong>{tip.head}</strong>
                <span>{tip.body}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="camera-scanner__toolbar" aria-live="polite">
        {starting && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Preparando cámara…
          </span>
        )}
        {live && !cameraReady && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Conectando cámara…
          </span>
        )}
        {live && cameraReady && captureBusy && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Capturando…
          </span>
        )}
        {live && cameraReady && !captureBusy && !manualBusy && (
          <span className="camera-scanner__pill camera-scanner__pill--live">
            <span className="camera-scanner__dot" aria-hidden />
            Cámara lista
          </span>
        )}
        {manualBusy && (
          <span className="camera-scanner__pill camera-scanner__pill--wait">
            Enviando código…
          </span>
        )}
        {done && (
          <span className="camera-scanner__pill camera-scanner__pill--ok">
            Enviando…
          </span>
        )}
      </div>

      <div className="camera-scanner__frame">
        <video
          ref={videoRef}
          className="camera-scanner__video"
          autoPlay
          playsInline
          muted
          aria-label="Vista de la cámara"
          onLoadedMetadata={(e) => {
            void playVideo(e.currentTarget)
          }}
          onLoadedData={() => setCameraReady(true)}
          onPlaying={() => setCameraReady(true)}
        />
        {(live || starting) && (
          <div className="camera-scanner__overlay" aria-hidden>
            <span className="camera-scanner__corners" />
          </div>
        )}
      </div>

      {showCapture && (
        <div className="camera-scanner__shutter-row">
          <button
            type="button"
            className="btn btn--primary camera-scanner__shutter-btn"
            onClick={() => void handleCapture()}
          >
            Capturar y enviar foto
          </button>
          <p className="camera-scanner__shutter-help">
            Se enviará la imagen al servidor. Si la cámara falla, use el código debajo.
          </p>
        </div>
      )}

      {statusLine && (
        <p className="camera-scanner__shutter-status" role="status" aria-live="polite">
          {statusLine}
        </p>
      )}

      {showManual && (
        <div className="camera-scanner__manual">
          <p className="camera-scanner__manual-title">{manualSectionTitle}</p>
          <label className="camera-scanner__manual-label" htmlFor="manual-barcode">
            {manualEntryLabel}
          </label>
          <div className="camera-scanner__manual-row">
            <input
              id="manual-barcode"
              type="text"
              className="camera-scanner__manual-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder=""
              autoComplete="off"
              disabled={busy || manualBusy}
            />
            <button
              type="button"
              className="btn btn--secondary camera-scanner__manual-btn"
              disabled={busy || manualBusy || !manualCode.trim()}
              onClick={() => void submitManual()}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="camera-scanner__status camera-scanner__status--err" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
