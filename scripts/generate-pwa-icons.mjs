import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'

// Deterministic, dependency-free geometric UH mark in the existing brand colors.
const directory = new URL('../public/icons/', import.meta.url)
await mkdir(directory, { recursive: true })

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(name, data) {
  const kind = Buffer.from(name)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([kind, data])))
  return Buffer.concat([length, kind, data, crc])
}

function letter(x, y) {
  // U: two stems with a circular lower bowl. H: two stems and a crossbar.
  const uStem = y >= .315 && y <= .565 && ((x >= .245 && x <= .292) || (x >= .415 && x <= .462))
  const uRadius = Math.hypot(x - .3535, y - .565)
  const uBowl = y >= .565 && uRadius <= .1085 && uRadius >= .0615
  const hStem = y >= .315 && y <= .674 && ((x >= .535 && x <= .582) || (x >= .712 && x <= .759))
  const hBar = x >= .57 && x <= .725 && y >= .470 && y <= .517
  return uStem || uBowl || hStem || hBar
}

function png(size, fullBleed) {
  const scanlines = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const channels = [0, 0, 0, 0]
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
        const px = (x + (dx + .5) / 4) / size
        const py = (y + (dy + .5) / 4) / size
        const rx = Math.max(.20 - px, 0, px - .80)
        const ry = Math.max(.20 - py, 0, py - .80)
        if (!fullBleed && Math.hypot(rx, ry) > .20) continue
        const t = (px + py) / 2
        const rgb = letter(px, py) ? [255, 255, 255] : [76 + 45 * t, 97 - 26 * t, 219 - 13 * t]
        rgb.forEach((value, i) => { channels[i] += value / 16 })
        channels[3] += 255 / 16
      }
      const offset = y * (size * 4 + 1) + 1 + x * 4
      channels.forEach((value, i) => { scanlines[offset + i] = Math.round(value) })
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0))])
}

for (const [name, size, fullBleed] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
  await writeFile(new URL(name, directory), png(size, fullBleed))
}
