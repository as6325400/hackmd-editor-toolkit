import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve('dist')
const manifestPath = path.join(distDir, 'manifest.json')

await access(manifestPath)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const requiredFiles = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((entry) => entry.js ?? []),
  ...Object.values(manifest.icons ?? {}),
].filter(Boolean)

for (const relativePath of requiredFiles) {
  await access(path.join(distDir, relativePath))
}

if (manifest.manifest_version !== 3) {
  throw new Error('manifest_version must be 3')
}

if (!Array.isArray(manifest.host_permissions) || !manifest.host_permissions.includes('https://hackmd.io/*')) {
  throw new Error('host_permissions must include https://hackmd.io/*')
}

console.log(`Validated build at ${manifestPath}`)
