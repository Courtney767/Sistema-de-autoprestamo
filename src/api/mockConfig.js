export const MOCK_STORAGE_USE = 'autoprestamos_use_mock'
export const MOCK_STORAGE_SCENARIO = 'autoprestamos_mock_scenario'

/** Escenarios para recorrer flujos y mensajes sin backend real */
export const MOCK_SCENARIOS = [
  { id: 'full_success', label: 'Todo OK — carnet y préstamo' },
  { id: 'carnet_rechazado', label: 'Carnet rechazado (valid: false)' },
  { id: 'carnet_error', label: 'Error de red al validar carnet' },
  { id: 'libro_rechazado', label: 'Carnet OK — libro no prestado' },
  { id: 'libro_error', label: 'Carnet OK — error al prestar libro' },
]

/**
 * Simulación activa en desarrollo si:
 * - VITE_USE_MOCK_API=true, o
 * - sessionStorage autoprestamos_use_mock === '1'
 */
/**
 * Demo con datos fijos (carnet + libro por códigos). Útil en producción sin backend.
 * Build con VITE_STATIC_LOAN_DEMO=true
 */
export function isStaticLoanDemoEnabled() {
  return import.meta.env.VITE_STATIC_LOAN_DEMO === 'true'
}

export function isMockApiEnabled() {
  if (import.meta.env.PROD) return false
  if (import.meta.env.VITE_USE_MOCK_API === 'true') return true
  try {
    return sessionStorage.getItem(MOCK_STORAGE_USE) === '1'
  } catch {
    return false
  }
}

export function getMockScenario() {
  try {
    return sessionStorage.getItem(MOCK_STORAGE_SCENARIO) || 'full_success'
  } catch {
    return 'full_success'
  }
}
