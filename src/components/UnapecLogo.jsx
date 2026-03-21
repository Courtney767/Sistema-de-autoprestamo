import './UnapecLogo.css'

/**
 * Logo oficial UNAPEC (`public/unapec-logo.png`).
 * Fuente y licencia: ver README (Wikimedia Commons, CC BY-SA 4.0).
 */
export function UnapecLogo() {
  return (
    <div className="unapec-logo">
      <img
        className="unapec-logo__img"
        src="/unapec-logo.png"
        alt="UNAPEC — Universidad Abierta para Adultos"
        width={600}
        height={148}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  )
}
