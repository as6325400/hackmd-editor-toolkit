import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import archiver from 'archiver'

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const outDir = path.resolve('artifacts')
await mkdir(outDir, { recursive: true })

const versionedArchivePath = path.join(outDir, `hackmd-editor-toolkit-v${packageJson.version}.zip`)
const archivePath = path.join(outDir, 'hackmd-editor-toolkit.zip')
const output = createWriteStream(versionedArchivePath)
const archive = archiver('zip', { zlib: { level: 9 } })

await new Promise((resolve, reject) => {
  output.on('close', resolve)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory('dist/', false)
  archive.finalize()
})

await copyFile(versionedArchivePath, archivePath)

console.log(`Created ${versionedArchivePath}`)
console.log(`Created ${archivePath}`)
