/**
 * Servidor de desarrollo: recibe los POST multipart que el front envía al proxy
 * de Vite (/api → 127.0.0.1:4010) y responde con JSON de contrato.
 *
 * Uso: en una terminal `npm run echo-api`, en otra `npm run dev`.
 * En el panel Mock, desactive «Usar simulación» para que las llamadas vayan por red.
 */
import http from 'node:http'

const PORT = Number(process.env.ECHO_API_PORT || 4010)
const HOST = process.env.ECHO_API_HOST || '127.0.0.1'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getBoundary(contentType) {
  if (!contentType || !contentType.includes('multipart/form-data')) return null
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)
  const raw = m?.[1] || m?.[2]
  return raw ? raw.trim() : null
}

/**
 * @param {Buffer} buffer
 * @param {string} boundary
 * @returns {{ foto: Buffer | null, codigoBarras: string }}
 */
function parseMultipart(buffer, boundary) {
  const marker = Buffer.from(`--${boundary}`)
  let pos = 0
  /** @type {Buffer | null} */
  let foto = null
  let codigoBarras = ''

  while (pos < buffer.length) {
    const i = buffer.indexOf(marker, pos)
    if (i === -1) break
    let cursor = i + marker.length
    if (cursor + 1 < buffer.length && buffer[cursor] === 0x2d && buffer[cursor + 1] === 0x2d) {
      break
    }
    if (cursor + 1 < buffer.length && buffer[cursor] === 0x0d && buffer[cursor + 1] === 0x0a) {
      cursor += 2
    }
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), cursor)
    if (headerEnd === -1) break
    const headers = buffer.subarray(cursor, headerEnd).toString('utf8')
    const nameMatch = /name="([^"]+)"/.exec(headers)
    const name = nameMatch?.[1]
    const bodyStart = headerEnd + 4
    const next = buffer.indexOf(marker, bodyStart)
    if (next === -1) break
    let bodyEnd = next
    if (bodyEnd >= 2 && buffer[bodyEnd - 2] === 0x0d && buffer[bodyEnd - 1] === 0x0a) {
      bodyEnd -= 2
    }
    const body = buffer.subarray(bodyStart, bodyEnd)
    if (name === 'foto') foto = Buffer.from(body)
    else if (name === 'codigoBarras') codigoBarras = body.toString('utf8').trim()
    pos = next
  }

  return { foto, codigoBarras }
}

function sniffImageKind(buf) {
  if (!buf?.length) return 'vacío'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG'
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'PNG'
  }
  return `binario (${buf[0]?.toString(16)}…)`
}

function json(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/'
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' })
    res.end('POST only')
    return
  }

  if (url !== '/api/prestamos/validar-carnet' && url !== '/api/prestamos/validar-libro') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const contentType = req.headers['content-type'] || ''
  const boundary = getBoundary(contentType)
  if (!boundary) {
    json(res, 400, { valid: false, message: 'Se esperaba multipart/form-data con boundary.' })
    return
  }

  const raw = await readBody(req)
  const { foto, codigoBarras } = parseMultipart(raw, boundary)

  const auth = req.headers.authorization || ''
  const bearerPreview =
    auth.startsWith('Bearer ') ? `${auth.slice(7, 24)}…` : '(sin Bearer)'

  const kind = sniffImageKind(foto)
  const bytes = foto?.length ?? 0

  console.log('')
  console.log('[echo-api]', new Date().toISOString(), req.method, url)
  console.log('  multipart foto:', bytes, 'bytes ·', kind)
  console.log('  codigoBarras:', JSON.stringify(codigoBarras))
  if (url.includes('validar-libro')) console.log('  Authorization:', bearerPreview)

  if (!foto || bytes < 16) {
    json(res, 400, {
      valid: false,
      message: 'No se recibió el campo multipart `foto` o está vacío.',
    })
    return
  }

  if (url === '/api/prestamos/validar-carnet') {
    json(res, 200, {
      valid: true,
      message: `Eco: imagen recibida (${bytes} B, ${kind}).`,
      koha: {
        patronId: `ECHO-${codigoBarras?.slice(0, 12) || 'sin-codigo'}`,
        sessionToken: 'echo-session-token-dev-only',
        displayName: 'Usuario de prueba (echo-api)',
      },
    })
    return
  }

  json(res, 200, {
    valid: true,
    message: `Eco: libro — imagen ${bytes} B (${kind}).`,
    libro: {
      titulo: 'Ejemplar verificado por echo-api',
      itemNumber: codigoBarras || 'ECHO-ITEM',
    },
  })
})

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error('')
    console.error(`echo-api: el puerto ${PORT} ya está en uso en ${HOST}.`)
    console.error('  Cierre la otra instancia (otra terminal con echo-api, backend, etc.).')
    console.error('')
    console.error('  PowerShell — ver proceso:')
    console.error(
      `    Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object OwningProcess`,
    )
    console.error('    Get-Process -Id <OwningProcess>')
    console.error('')
    console.error('  Otro puerto (recuerde igualar vite.config.js → server.proxy./api.target):')
    console.error(`    $env:ECHO_API_PORT=4020; npm run echo-api`)
    console.error('')
    process.exit(1)
    return
  }
  console.error(err)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`echo-api escuchando en http://${HOST}:${PORT}`)
  console.log('  POST /api/prestamos/validar-carnet')
  console.log('  POST /api/prestamos/validar-libro')
  console.log('Desactive el mock en el panel dev para usar este servidor vía proxy Vite.')
})
