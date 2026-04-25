import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const manifestConfig = await readFile('manifest.config.ts', 'utf8')
const manifestVersion = manifestConfig.match(/version:\s*['"]([^'"]+)['"]/)?.[1]

if (!manifestVersion) {
  throw new Error('Could not find version in manifest.config.ts')
}

if (packageJson.version !== manifestVersion) {
  throw new Error(
    `Version mismatch: package.json has ${packageJson.version}, manifest.config.ts has ${manifestVersion}`,
  )
}

const tagName = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined
if (tagName) {
  const expectedTag = `v${packageJson.version}`
  if (tagName !== expectedTag) {
    throw new Error(`Tag mismatch: expected ${expectedTag}, got ${tagName}`)
  }
}

console.log(`Validated version ${packageJson.version}`)
