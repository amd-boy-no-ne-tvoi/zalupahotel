/**
 * Generates PNG icons for PWA.
 * Uses only Node.js built-ins (zlib for compression, fs for writing).
 * Produces a solid dark-blue background with a centered paw emoji rendered
 * as a coloured circle (no canvas needed).
 * Run once: node generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.concat([typeBuf, data])
  const out = Buffer.alloc(4 + 4 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  typeBuf.copy(out, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length)
  return out
}

/**
 * Creates a PNG icon: dark bg + accent circle + paw dots pattern.
 * @param {number} size - width/height in pixels
 */
function makePNG(size) {
  // Palette
  const BG = [5, 8, 20]          // #050814
  const CIRCLE = [0, 100, 160]   // deep cyan-blue
  const DOT = [165, 243, 252]     // #a5f3fc (accent)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38          // main circle radius

  // Paw print relative positions (normalised to size)
  const pads = [
    { dx: -0.18, dy: -0.14, r: 0.085 }, // top-left toe
    { dx: -0.06, dy: -0.22, r: 0.085 }, // top-center-left toe
    { dx:  0.06, dy: -0.22, r: 0.085 }, // top-center-right toe
    { dx:  0.18, dy: -0.14, r: 0.085 }, // top-right toe
    { dx:  0,    dy:  0.04, r: 0.16  }, // main pad
  ]

  // Raw scanlines: filter byte + RGBA pixels
  const rowBytes = 1 + size * 4
  const raw = Buffer.alloc(size * rowBytes, 0)

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0 // filter = None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      let [R, G, B, A] = [...BG, 255]

      // Gradient circle background
      if (dist < r) {
        const t = dist / r
        R = Math.round(BG[0] + (CIRCLE[0] - BG[0]) * (1 - t * t))
        G = Math.round(BG[1] + (CIRCLE[1] - BG[1]) * (1 - t * t))
        B = Math.round(BG[2] + (CIRCLE[2] - BG[2]) * (1 - t * t))
      }

      // Paw dots
      for (const pad of pads) {
        const px = cx + pad.dx * size
        const py = cy + pad.dy * size
        const pr = pad.r * size
        const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
        if (d < pr) {
          // smooth edge
          const alpha = Math.max(0, Math.min(1, (pr - d) / (pr * 0.12)))
          R = Math.round(R + (DOT[0] - R) * alpha)
          G = Math.round(G + (DOT[1] - G) * alpha)
          B = Math.round(B + (DOT[2] - B) * alpha)
        }
      }

      const off = y * rowBytes + 1 + x * 4
      raw[off] = R; raw[off + 1] = G; raw[off + 2] = B; raw[off + 3] = A
    }
  }

  const compressed = deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8)  // bit depth
  ihdr.writeUInt8(6, 9)  // RGBA colour type
  ihdr.writeUInt8(0, 10); ihdr.writeUInt8(0, 11); ihdr.writeUInt8(0, 12)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', makePNG(192))
writeFileSync('public/icon-512.png', makePNG(512))
writeFileSync('public/apple-touch-icon.png', makePNG(180))
console.log('✓ Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png')
