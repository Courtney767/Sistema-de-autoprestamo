import { useCallback, useEffect, useState, startTransition } from 'react'
import {
  MOCK_SCENARIOS,
  MOCK_STORAGE_SCENARIO,
  MOCK_STORAGE_USE,
  getMockScenario,
  isMockApiEnabled,
} from '../api/mockConfig.js'

/**
 * Panel solo en `npm run dev`: activa respuestas simuladas y saltos entre pantallas.
 */
export function DevMockPanel({
  goInicio,
  goEscanearCarnet,
  goSesionMock,
  goEscanearLibro,
  goResultadoExito,
  goResultadoFallo,
}) {
  const [open, setOpen] = useState(false)
  const [mockOn, setMockOn] = useState(() => isMockApiEnabled())
  const [scenario, setScenario] = useState(() => getMockScenario())

  const syncFromStorage = useCallback(() => {
    setMockOn(isMockApiEnabled())
    setScenario(getMockScenario())
  }, [])

  useEffect(() => {
    startTransition(() => syncFromStorage())
  }, [syncFromStorage, open])

  const setMockEnabled = (on) => {
    try {
      if (on) sessionStorage.setItem(MOCK_STORAGE_USE, '1')
      else sessionStorage.removeItem(MOCK_STORAGE_USE)
    } catch {
      /* ignore */
    }
    setMockOn(on)
  }

  const setScenarioId = (id) => {
    try {
      sessionStorage.setItem(MOCK_STORAGE_SCENARIO, id)
    } catch {
      /* ignore */
    }
    setScenario(id)
  }

  return (
    <div className="dev-mock">
      <button
        type="button"
        className="dev-mock__fab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Simulación de API (solo desarrollo)"
      >
        {open ? '✕' : 'Mock'}
      </button>

      {open && (
        <div className="dev-mock__panel" role="dialog" aria-label="Simulación API">
          <h3 className="dev-mock__title">API simulada</h3>
          <p className="dev-mock__hint">
            Sin backend Python: las llamadas usan respuestas de prueba. En consola del
            navegador verá <code>[mock API]</code> con el tamaño del <code>Blob</code>.
            Para comprobar el <strong>multipart por HTTP</strong>, desactive esta
            simulación y ejecute <code>npm run echo-api</code> (puerto 4010); el log
            sale en la terminal de Node.
          </p>

          <label className="dev-mock__row">
            <input
              type="checkbox"
              checked={mockOn}
              onChange={(e) => setMockEnabled(e.target.checked)}
            />
            <span>Usar simulación (o defina <code>VITE_USE_MOCK_API=true</code>)</span>
          </label>

          <label className="dev-mock__label" htmlFor="dev-mock-scenario">
            Escenario de respuesta
          </label>
          <select
            id="dev-mock-scenario"
            className="dev-mock__select"
            value={scenario}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            {MOCK_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <p className="dev-mock__sub">Atajos de pantalla (sin cámara)</p>
          <div className="dev-mock__shortcuts">
            <button type="button" className="dev-mock__btn" onClick={goInicio}>
              Inicio
            </button>
            <button
              type="button"
              className="dev-mock__btn"
              onClick={goEscanearCarnet}
            >
              Escanear carnet
            </button>
            <button type="button" className="dev-mock__btn" onClick={goSesionMock}>
              Sesión activa
            </button>
            <button
              type="button"
              className="dev-mock__btn"
              onClick={goEscanearLibro}
            >
              Escanear libro
            </button>
            <button
              type="button"
              className="dev-mock__btn"
              onClick={goResultadoExito}
            >
              Resultado OK
            </button>
            <button
              type="button"
              className="dev-mock__btn"
              onClick={goResultadoFallo}
            >
              Resultado rechazado
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
