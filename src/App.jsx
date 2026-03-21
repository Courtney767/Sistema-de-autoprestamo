import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraScanner } from './components/CameraScanner'
import { UnapecLogo } from './components/UnapecLogo.jsx'
import { HomeWelcome } from './components/HomeWelcome.jsx'
import { SessionActivePanel } from './components/SessionActivePanel.jsx'
import { BookLoanResultPanel } from './components/BookLoanResultPanel.jsx'
import { validarCarnet, validarLibro } from './api/loansApi'
import { getUserFacingApiError } from './api/userFacingError.js'
import { DevMockPanel } from './dev/DevMockPanel.jsx'
import { MOCK_KOHA_SHORTCUT } from './dev/mockShortcuts.js'
import './App.css'

const STEPS = {
  INICIO: 'inicio',
  ESCANEAR_CARNET: 'escanear_carnet',
  SESION: 'sesion',
  ESCANEAR_LIBRO: 'escanear_libro',
  RESULTADO_LIBRO: 'resultado_libro',
}

/**
 * @param {{ title: string, detail: string, codeLabel?: string }} props
 */
function PanelApiError({ title, detail, codeLabel }) {
  return (
    <div className="panel__alert panel__alert--error" role="alert">
      <span className="panel__alert-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className="panel__alert-body">
        <strong className="panel__alert-title">
          {title}
          {codeLabel ? (
            <span className="panel__alert-code-inline"> · {codeLabel}</span>
          ) : null}
        </strong>
        <p className="panel__alert-detail">{detail}</p>
      </div>
    </div>
  )
}

function App() {
  const apiErrorBannerRef = useRef(null)

  const [step, setStep] = useState(STEPS.INICIO)
  const [cardScanKey, setCardScanKey] = useState(0)
  const [bookScanKey, setBookScanKey] = useState(0)
  const [loading, setLoading] = useState(false)
  /** @type {[{ title: string, detail: string, codeLabel?: string } | null, function]} */
  const [cardError, setCardError] = useState(null)
  /** @type {[{ title: string, detail: string, codeLabel?: string } | null, function]} */
  const [bookError, setBookError] = useState(null)
  const [bookResult, setBookResult] = useState(null)

  /** @type {[{ patronId?: string, sessionToken?: string, displayName?: string } | null, function]} */
  const [kohaSession, setKohaSession] = useState(null)

  useEffect(() => {
    if (!cardError && !bookError) return
    const id = requestAnimationFrame(() => {
      apiErrorBannerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [cardError, bookError])

  const goInicio = () => {
    setStep(STEPS.INICIO)
    setKohaSession(null)
    setCardError(null)
    setBookError(null)
    setBookResult(null)
    setCardScanKey((k) => k + 1)
    setBookScanKey((k) => k + 1)
  }

  const handleCardCapture = useCallback(
    async ({ barcodeText, imageBlob }) => {
      setLoading(true)
      setCardError(null)
      try {
        const data = await validarCarnet({
          imageBlob,
          codigoBarras: barcodeText ?? '',
        })
        if (data.valid && data.koha?.sessionToken) {
          setKohaSession(data.koha)
          setStep(STEPS.SESION)
        } else {
          setCardError({
            title: 'No se pudo verificar el carnet',
            detail: data.message || 'Revise los datos o consulte en biblioteca.',
          })
          setCardScanKey((k) => k + 1)
        }
      } catch (e) {
        setCardError(getUserFacingApiError(e, 'carnet'))
        setCardScanKey((k) => k + 1)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleBookCapture = useCallback(
    async ({ barcodeText, imageBlob }) => {
      if (!kohaSession?.sessionToken) return
      setLoading(true)
      setBookError(null)
      try {
        const data = await validarLibro({
          imageBlob,
          codigoBarras: barcodeText ?? '',
          sessionToken: kohaSession.sessionToken,
        })
        setBookResult(data)
        setStep(STEPS.RESULTADO_LIBRO)
      } catch (e) {
        setBookError(getUserFacingApiError(e, 'libro'))
        setBookScanKey((k) => k + 1)
      } finally {
        setLoading(false)
      }
    },
    [kohaSession],
  )

  const goEscanearCarnetDev = useCallback(() => {
    setCardError(null)
    setKohaSession(null)
    setStep(STEPS.ESCANEAR_CARNET)
    setCardScanKey((k) => k + 1)
  }, [])

  const goSesionMockDev = useCallback(() => {
    setCardError(null)
    setKohaSession({ ...MOCK_KOHA_SHORTCUT })
    setStep(STEPS.SESION)
  }, [])

  const goEscanearLibroDev = useCallback(() => {
    setKohaSession((prev) => prev ?? { ...MOCK_KOHA_SHORTCUT })
    setBookError(null)
    setBookResult(null)
    setStep(STEPS.ESCANEAR_LIBRO)
    setBookScanKey((k) => k + 1)
  }, [])

  const goResultadoExitoDev = useCallback(() => {
    setKohaSession((prev) => prev ?? { ...MOCK_KOHA_SHORTCUT })
    setBookResult({
      valid: true,
      message: 'Préstamo registrado (vista previa con atajo dev).',
      libro: { titulo: 'Ejemplo de título — mock UI', itemNumber: 'DEV-001' },
    })
    setStep(STEPS.RESULTADO_LIBRO)
  }, [])

  const goResultadoFalloDev = useCallback(() => {
    setKohaSession((prev) => prev ?? { ...MOCK_KOHA_SHORTCUT })
    setBookResult({
      valid: false,
      message: 'No se pudo prestar (vista previa con atajo dev).',
      libro: { titulo: 'Ejemplo — ejemplar no disponible' },
    })
    setStep(STEPS.RESULTADO_LIBRO)
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand-row">
            <div className="app__brand-logo">
              <UnapecLogo />
            </div>
            <span className="app__brand-divider" aria-hidden="true" />
            <div className="app__titles">
              <h1 className="app__brand">Autopréstamos</h1>
              <p className="app__tagline">Biblioteca UNAPEC</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app__main">
        {step === STEPS.INICIO && (
          <section className="panel panel--home">
            <HomeWelcome
              onStart={() => {
                setCardError(null)
                setStep(STEPS.ESCANEAR_CARNET)
                setCardScanKey((k) => k + 1)
              }}
            />
          </section>
        )}

        {step === STEPS.ESCANEAR_CARNET && (
          <section className="panel">
            <CameraScanner
              key={cardScanKey}
              title="Identificación"
              instruction="Encuadre el carnet y pulse «Capturar y enviar foto». El servidor procesará la imagen."
              manualSectionTitle="¿Sin cámara o no se ve el carnet?"
              manualEntryLabel="Escriba el número o código de su carnet y pulse Continuar"
              visualVariant="carnet"
              onCapture={handleCardCapture}
              busy={loading}
            />
            {loading && (
              <p className="panel__loading" aria-live="polite">
                Verificando carnet…
              </p>
            )}
            {cardError && (
              <div ref={apiErrorBannerRef}>
                <PanelApiError {...cardError} />
              </div>
            )}
            <div className="panel__actions">
              <button type="button" className="btn btn--ghost" onClick={goInicio}>
                Inicio
              </button>
              {!loading && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setCardScanKey((k) => k + 1)}
                >
                  Volver a tomar foto
                </button>
              )}
            </div>
          </section>
        )}

        {step === STEPS.SESION && kohaSession && (
          <section className="panel panel--session">
            <SessionActivePanel
              displayName={kohaSession.displayName}
              patronId={kohaSession.patronId}
              onPedirLibro={() => {
                setBookError(null)
                setBookResult(null)
                setStep(STEPS.ESCANEAR_LIBRO)
                setBookScanKey((k) => k + 1)
              }}
              onSalir={goInicio}
            />
          </section>
        )}

        {step === STEPS.ESCANEAR_LIBRO && (
          <section className="panel">
            <CameraScanner
              key={bookScanKey}
              title="Ejemplar"
              instruction="Encuadre el libro o el código del ejemplar y pulse «Capturar y enviar foto»."
              manualSectionTitle="¿Sin cámara o no se ve el código del libro?"
              manualEntryLabel="Escriba el código de barras o inventario del ejemplar y pulse Continuar"
              visualVariant="libro"
              onCapture={handleBookCapture}
              busy={loading}
            />
            {loading && (
              <p className="panel__loading" aria-live="polite">
                Registrando préstamo…
              </p>
            )}
            {bookError && (
              <div ref={apiErrorBannerRef}>
                <PanelApiError {...bookError} />
              </div>
            )}
            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep(STEPS.SESION)}
              >
                Volver
              </button>
              {!loading && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setBookScanKey((k) => k + 1)}
                >
                  Volver a tomar foto
                </button>
              )}
            </div>
          </section>
        )}

        {step === STEPS.RESULTADO_LIBRO && bookResult && (
          <section className="panel panel--book-result">
            <BookLoanResultPanel
              result={bookResult}
              onOtroLibro={() => {
                setBookResult(null)
                setStep(STEPS.ESCANEAR_LIBRO)
                setBookScanKey((k) => k + 1)
              }}
              onVolverSesion={() => setStep(STEPS.SESION)}
              onInicio={goInicio}
            />
          </section>
        )}
      </main>

      {import.meta.env.DEV && (
        <DevMockPanel
          goInicio={goInicio}
          goEscanearCarnet={goEscanearCarnetDev}
          goSesionMock={goSesionMockDev}
          goEscanearLibro={goEscanearLibroDev}
          goResultadoExito={goResultadoExitoDev}
          goResultadoFallo={goResultadoFalloDev}
        />
      )}
    </div>
  )
}

export default App
