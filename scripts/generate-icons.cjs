// Genera icone PWA (192x192 e 512x512) come semplici PNG disegnati a mano,
// senza dipendenze esterne (usa solo zlib incluso in Node).
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = []
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size, drawPixel) {
  const width = size
  const height = size
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0 // filtro "none"
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height)
      const off = rowStart + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Design: sfondo blu scuro (#0f172a), una "scatola" bianca stilizzata al centro
// (rettangolo con una linea a V per il coperchio, come un'icona di magazzino).
function drawIcon(x, y, w, h) {
  const bg = [15, 23, 42, 255] // slate-900
  const fg = [255, 255, 255, 255]
  const accent = [59, 130, 246, 255] // brand-500

  const cx = w / 2
  const cy = h / 2
  const boxHalf = w * 0.28

  const left = cx - boxHalf
  const right = cx + boxHalf
  const top = cy - boxHalf * 0.85
  const bottom = cy + boxHalf

  const within = (v, a, b) => v >= a && v <= b
  const thickness = Math.max(2, w * 0.035)

  const nearLine = (px, py, x1, y1, x2, y2) => {
    const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2
    if (lenSq === 0) return Math.hypot(px - x1, py - y1) < thickness
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lenSq
    t = Math.max(0, Math.min(1, t))
    const projX = x1 + t * (x2 - x1)
    const projY = y1 + t * (y2 - y1)
    return Math.hypot(px - projX, py - projY) < thickness
  }

  // Contorno scatola (quadrato)
  const onBorder =
    nearLine(x, y, left, top, right, top) ||
    nearLine(x, y, left, bottom, right, bottom) ||
    nearLine(x, y, left, top, left, bottom) ||
    nearLine(x, y, right, top, right, bottom)

  // Linea centrale verticale (apertura scatola)
  const onMid = nearLine(x, y, cx, top, cx, bottom)

  // "Coperchio" a V
  const flapY = top - boxHalf * 0.45
  const onFlap =
    nearLine(x, y, left, top, cx, flapY) || nearLine(x, y, cx, flapY, right, top)

  if (onFlap) return accent
  if (onBorder || onMid) return fg
  if (within(x, left, right) && within(y, top, bottom)) {
    return [30, 41, 59, 255] // slate-800, interno scatola
  }
  return bg
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const png = makePng(size, drawIcon)
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png)
  console.log(`Creata icons/icon-${size}.png`)
}
