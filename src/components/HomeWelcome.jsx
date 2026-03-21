/**
 * Pantalla de inicio: texto + flujo visual continuo (sin recuadro tipo tarjeta).
 */
export function HomeWelcome({ onStart }) {
  return (
    <div className="home-welcome">
      <h2 className="home-welcome__title">Bienvenido</h2>
      <p className="home-welcome__lead">
        Identifíquese con su carnet y fotografíe el ejemplar que desea llevar. El sistema
        comprobará reglas de préstamo y disponibilidad.
      </p>

      <ol className="home-welcome__steps" aria-label="Pasos del préstamo">
        <li className="home-welcome__step">
          <span className="home-welcome__step-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
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
          </span>
          <span className="home-welcome__step-text">
            <strong>Carnet</strong>
            <span>Foto o código manual</span>
          </span>
        </li>
        <li className="home-welcome__step">
          <span className="home-welcome__step-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
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
          </span>
          <span className="home-welcome__step-text">
            <strong>Libro</strong>
            <span>Foto o código del ejemplar</span>
          </span>
        </li>
        <li className="home-welcome__step">
          <span className="home-welcome__step-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </span>
          <span className="home-welcome__step-text">
            <strong>Listo</strong>
            <span>Resultado en pantalla</span>
          </span>
        </li>
      </ol>

      <div className="home-welcome__cta">
        <button type="button" className="btn btn--primary home-welcome__btn" onClick={onStart}>
          Préstamos
        </button>
        <p className="home-welcome__cta-hint">Toque para identificarse con su carnet</p>
      </div>
    </div>
  )
}
