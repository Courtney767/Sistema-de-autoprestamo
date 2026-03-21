# Autopréstamos — Frontend (UNAPEC)

Aplicación web (React + Vite) para el flujo de **autopréstamos** en biblioteca: captura de **foto** del carnet y del ejemplar (el servidor interpreta la imagen). La lógica de negocio y la integración con Koha viven en un **backend** aparte; este repo es solo el cliente.

## Requisitos

- Node.js **20.19+** o **22.12+** (requerido por Vite 8; en Vercel se respeta `engines` en `package.json`)
- npm

## Instalación y uso.

```bash
npm install
npm run dev
```

En desarrollo, las peticiones a `/api` se envían por proxy a `http://127.0.0.1:4010` (configurable en `vite.config.js`).

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run echo-api` | Servidor local que recibe los POST multipart en el puerto **4010** (validar envío de imagen sin API real; desactivar mock en el panel dev) |
| `npm run build` | Compilación para producción (`dist/`) |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint |

## Variables de entorno

Crear `.env.local` en la raíz si hace falta (prefijo `VITE_`):

- `VITE_API_BASE_URL` — URL base del API (opcional; si está vacío se usan rutas `/api/...`).
- `VITE_USE_MOCK_API=true` — En desarrollo, fuerza respuestas simuladas sin backend.

Detalle de endpoints, mock y flujo de pantallas: **[DOCUMENTACION.md](./DOCUMENTACION.md)**.

## Logotipo UNAPEC

El archivo `public/unapec-logo.png` proviene de [Wikimedia Commons — LOGO UNAPEC.png](https://commons.wikimedia.org/wiki/File:LOGO_UNAPEC.png), licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Atribución: Universidad APEC / UNAPEC; archivo subido por la comunidad de Commons.
