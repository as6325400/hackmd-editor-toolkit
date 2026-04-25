import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import archiver from 'archiver'

const outDir = path.resolve('artifacts')
await mkdir(outDir, { recursive: true })

const archivePath = path.join(outDir, 'hackmd-editor-toolkit.zip')
const output = createWriteStream(archivePath)
const archive = archiver('zip', { zlib: { level: 9 } })

await new Promise((resolve, reject) => {
  output.on('close', resolve)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory('dist/', false)
  archive.finalize()
})

console.log(`Created ${archivePath}`)
