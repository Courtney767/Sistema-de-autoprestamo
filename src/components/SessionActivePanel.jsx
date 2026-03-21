/**
 * Pantalla tras verificar carnet: sesión lista para registrar un préstamo.
 */
export function SessionActivePanel({
  displayName,
  patronId,
  onPedirLibro,
  onSalir,
}) {
  const nombre = displayName?.trim()

  return (
    <div className="session-active">
      <div className="session-active__badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M8 12l2.5 2.5L16 9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="session-active__title">Sesión activa</h2>

      <p className="session-active__greet">
        {nombre ? (
          <>
            Hola, <span className="session-active__name">{nombre}</span>. Su carnet quedó
            verificado y puede continuar con el préstamo.
          </>
        ) : (
          <>Su carnet quedó verificado. Puede continuar con el préstamo.</>
        )}
      </p>

      {patronId ? (
        <p className="session-active__ref">
          Referencia en sistema: <code>{patronId}</code>
        </p>
      ) : null}

      <ul className="session-active__hints" aria-label="Qué hacer ahora">
        <li className="session-active__hint">
          <span className="session-active__hint-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path
                d="M5 4h12a2 2 0 012 2v13a1 1 0 01-1 1H6a2 2 0 01-2-2V4z"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinejoin="round"
              />
              <path
                d="M5 4v14a2 2 0 002 2h11"
                stroke="currentColor"
                strokeWidth="1.65"
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
          <span>
            <strong>Busque el ejemplar</strong>
            <span>Tome el libro físico que desea llevarse.</span>
          </span>
        </li>
        <li className="session-active__hint">
          <span className="session-active__hint-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <rect
                x="3"
                y="6"
                width="18"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.65"
              />
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span>
            <strong>Luego fotografíe el código</strong>
            <span>Podrá usar la cámara o escribir el código del ejemplar.</span>
          </span>
        </li>
      </ul>

      <div className="session-active__actions">
        <button type="button" className="btn btn--primary session-active__btn-primary" onClick={onPedirLibro}>
          Pedir un libro
        </button>
        <p className="session-active__actions-hint">Continúa cuando tenga el ejemplar a mano</p>
        <button type="button" className="btn btn--ghost session-active__btn-ghost" onClick={onSalir}>
          Salir y cerrar sesión
        </button>
      </div>
    </div>
  )
}
