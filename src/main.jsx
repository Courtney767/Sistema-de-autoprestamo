import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const cameraDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('cameraDebug') === '1'

if (import.meta.env.DEV || cameraDebug) {
  import('./lib/cameraDiagnostics.js').then(({ probeCameraInConsole }) => {
    window.__SISTEMA_CAMERA_DEBUG__ = { probe: probeCameraInConsole }
    console.info(
      '[Sistema] Diagnóstico de cámara: en la consola ejecute await __SISTEMA_CAMERA_DEBUG__.probe()',
    )
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
