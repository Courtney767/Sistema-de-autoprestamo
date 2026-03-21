/**
 * Pantalla de resultado del préstamo de un ejemplar (éxito o rechazo).
 * @param {{
 *   result: { valid: boolean, message?: string, libro?: { titulo?: string, itemNumber?: string } },
 *   onOtroLibro: () => void,
 *   onVolverSesion: () => void,
 *   onInicio: () => void,
 * }} props
 */
export function BookLoanResultPanel({
  result,
  onOtroLibro,
  onVolverSesion,
  onInicio,
}) {
  const { valid, message, libro } = result
  const titulo = libro?.titulo?.trim()
  const itemNumber = libro?.itemNumber?.trim()

  const defaultMessage = valid
    ? 'Retire el ejemplar cuando termine.'
    : 'Acérquese al mostrador si necesita ayuda.'

  return (
    <div className={`book-result ${valid ? 'book-result--ok' : 'book-result--ko'}`}>
      <div className="book-result__badge" aria-hidden="true">
        {valid ? (
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M8 12l2.5 2.5L16 9"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M9 9l6 6M15 9l-6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <h2 className="book-result__title">
        {valid ? 'Préstamo autorizado' : 'No se pudo prestar'}
      </h2>

      <p className="book-result__message">{message || defaultMessage}</p>

      {titulo ? (
        <div className="book-result__libro">
          <span className="book-result__libro-label">Ejemplar</span>
          <strong className="book-result__libro-titulo">{titulo}</strong>
          {itemNumber ? (
            <span className="book-result__libro-ref">
              Ref. <code>{itemNumber}</code>
            </span>
          ) : null}
        </div>
      ) : null}

      <ul className="book-result__hints" aria-label="Siguientes pasos">
        {valid ? (
          <>
            <li className="book-result__hint">
              <span className="book-result__hint-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <path
                    d="M5 4h12a2 2 0 012 2v13a1 1 0 01-1 1H6a2 2 0 01-2-2V4z"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinejoin="round"
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
                <strong>Lleve el libro</strong>
                <span>Ya puede retirar el ejemplar de la biblioteca.</span>
              </span>
            </li>
            <li className="book-result__hint">
              <span className="book-result__hint-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <path
                    d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-4.5v-7h-5v7H5a1 1 0 01-1-1v-9.5z"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                <strong>¿Terminó?</strong>
                <span>Use Inicio para salir del kiosco o Volver para otra acción en su sesión.</span>
              </span>
            </li>
          </>
        ) : (
          <>
            <li className="book-result__hint">
              <span className="book-result__hint-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
                  <path
                    d="M12 8v5M12 16h.01"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                <strong>Revise el mensaje</strong>
                <span>Puede deberse a disponibilidad, límites de préstamo o datos del ejemplar.</span>
              </span>
            </li>
            <li className="book-result__hint">
              <span className="book-result__hint-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <path
                    d="M4 19h16M8 21h8M9 15h6"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 3v6M9 6h6"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                <strong>Mostrador</strong>
                <span>Si no está claro, el personal de biblioteca puede ayudarle.</span>
              </span>
            </li>
          </>
        )}
      </ul>

      <div className="book-result__actions">
        <button type="button" className="btn btn--primary book-result__btn-primary" onClick={onOtroLibro}>
          Otro libro
        </button>
        <button type="button" className="btn btn--secondary book-result__btn-secondary" onClick={onVolverSesion}>
          Volver
        </button>
        <button type="button" className="btn btn--ghost book-result__btn-ghost" onClick={onInicio}>
          Inicio
        </button>
      </div>
    </div>
  )
}
