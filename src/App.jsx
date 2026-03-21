import { useCallback, useState } from 'react'
import { CameraScanner } from './components/CameraScanner'
import { UnapecLogo } from './components/UnapecLogo.jsx'
import { validarCarnet, validarLibro } from './api/loansApi'
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

function App() {
  const [step, setStep] = useState(STEPS.INICIO)
  const [cardScanKey, setCardScanKey] = useState(0)
  const [bookScanKey, setBookScanKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cardError, setCardError] = useState('')
  const [bookError, setBookError] = useState('')
  const [bookResult, setBookResult] = useState(null)

  /** @type {[{ patronId?: string, sessionToken?: string, displayName?: string } | null, function]} */
  const [kohaSession, setKohaSession] = useState(null)

  const goInicio = () => {
    setStep(STEPS.INICIO)
    setKohaSession(null)
    setCardError('')
    setBookError('')
    setBookResult(null)
    setCardScanKey((k) => k + 1)
    setBookScanKey((k) => k + 1)
  }

  const handleCardCapture = useCallback(
    async ({ barcodeText, imageBlob }) => {
      setLoading(true)
      setCardError('')
      try {
        const data = await validarCarnet({
          imageBlob,
          codigoBarras: barcodeText,
        })
        if (data.valid && data.koha?.sessionToken) {
          setKohaSession(data.koha)
          setStep(STEPS.SESION)
        } else {
          setCardError(
            data.message ||
              'Carnet no válido o sin permisos. Verifique con biblioteca.',
          )
          setCardScanKey((k) => k + 1)
        }
      } catch (e) {
        setCardError(e.message || 'Error al validar el carnet.')
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
      setBookError('')
      try {
        const data = await validarLibro({
          imageBlob,
          codigoBarras: barcodeText,
          sessionToken: kohaSession.sessionToken,
        })
        setBookResult(data)
        setStep(STEPS.RESULTADO_LIBRO)
      } catch (e) {
        setBookError(e.message || 'Error al procesar el préstamo.')
        setBookScanKey((k) => k + 1)
      } finally {
        setLoading(false)
      }
    },
    [kohaSession],
  )

  const goEscanearCarnetDev = useCallback(() => {
    setCardError('')
    setKohaSession(null)
    setStep(STEPS.ESCANEAR_CARNET)
    setCardScanKey((k) => k + 1)
  }, [])

  const goSesionMockDev = useCallback(() => {
    setCardError('')
    setKohaSession({ ...MOCK_KOHA_SHORTCUT })
    setStep(STEPS.SESION)
  }, [])

  const goEscanearLibroDev = useCallback(() => {
    setKohaSession((prev) => prev ?? { ...MOCK_KOHA_SHORTCUT })
    setBookError('')
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
              <p className="app__tagline">Biblioteca · integración Koha</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app__main">
        {step === STEPS.INICIO && (
          <section className="panel panel--home">
            <h2 className="panel__title">Bienvenido</h2>
            <p className="panel__text">
              Use el lector para identificarse con su carnet y solicitar un
              libro. El backend consultará Koha (disponibilidad, límites y
              sanciones).
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setCardError('')
                setStep(STEPS.ESCANEAR_CARNET)
                setCardScanKey((k) => k + 1)
              }}
            >
              Préstamos
            </button>
          </section>
        )}

        {step === STEPS.ESCANEAR_CARNET && (
          <section className="panel">
            <CameraScanner
              key={cardScanKey}
              title="Carnet de estudiante"
              instruction="Coloque el código de barras del carnet (Cardnet) frente a la cámara. Si no lo detecta solo, use «Capturar foto y leer código» cuando lo vea nítido, o escriba el número abajo. La imagen y el código se envían al servidor para validar."
              onCapture={handleCardCapture}
              busy={loading}
            />
            {loading && (
              <p className="panel__loading" aria-live="polite">
                Validando carnet con el servidor…
              </p>
            )}
            {cardError && (
              <p className="panel__error" role="alert">
                {cardError}
              </p>
            )}
            <div className="panel__actions">
              <button type="button" className="btn btn--ghost" onClick={goInicio}>
                Volver al inicio
              </button>
              {!loading && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setCardScanKey((k) => k + 1)}
                >
                  Reintentar escaneo
                </button>
              )}
            </div>
          </section>
        )}

        {step === STEPS.SESION && kohaSession && (
          <section className="panel">
            <h2 className="panel__title">Sesión activa</h2>
            <p className="panel__text">
              {kohaSession.displayName
                ? `Hola, ${kohaSession.displayName}.`
                : 'Carnet verificado correctamente.'}{' '}
              Los datos de Koha ya están asociados a esta sesión en el servidor.
            </p>
            {kohaSession.patronId && (
              <p className="panel__meta">
                ID usuario Koha: <code>{kohaSession.patronId}</code>
              </p>
            )}
            <div className="panel__actions panel__actions--stack">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setBookError('')
                  setBookResult(null)
                  setStep(STEPS.ESCANEAR_LIBRO)
                  setBookScanKey((k) => k + 1)
                }}
              >
                Pedir un libro
              </button>
              <button type="button" className="btn btn--ghost" onClick={goInicio}>
                Cerrar y volver al inicio
              </button>
            </div>
          </section>
        )}

        {step === STEPS.ESCANEAR_LIBRO && (
          <section className="panel">
            <CameraScanner
              key={bookScanKey}
              title="Código del libro"
              instruction="Coloque el código de barras del ejemplar frente a la cámara. Puede usar «Capturar foto y leer código» o el ingreso manual si hace falta. El servidor validará disponibilidad, cupo y sanciones en Koha."
              onCapture={handleBookCapture}
              busy={loading}
            />
            {loading && (
              <p className="panel__loading" aria-live="polite">
                Validando libro y reglas de préstamo…
              </p>
            )}
            {bookError && (
              <p className="panel__error" role="alert">
                {bookError}
              </p>
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
                  Reintentar escaneo
                </button>
              )}
            </div>
          </section>
        )}

        {step === STEPS.RESULTADO_LIBRO && bookResult && (
          <section className="panel">
            <h2 className="panel__title">
              {bookResult.valid ? 'Préstamo autorizado' : 'No se pudo prestar'}
            </h2>
            <p className="panel__text">
              {bookResult.message ||
                (bookResult.valid
                  ? 'El ejemplar quedó registrado como prestado.'
                  : 'Revise el mensaje o consulte en mostrador.')}
            </p>
            {bookResult.libro?.titulo && (
              <p className="panel__meta">
                Libro: <strong>{bookResult.libro.titulo}</strong>
              </p>
            )}
            <div className="panel__actions panel__actions--stack">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setBookResult(null)
                  setStep(STEPS.ESCANEAR_LIBRO)
                  setBookScanKey((k) => k + 1)
                }}
              >
                Otro libro
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setStep(STEPS.SESION)}
              >
                Volver al menú de sesión
              </button>
              <button type="button" className="btn btn--ghost" onClick={goInicio}>
                Inicio
              </button>
            </div>
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
