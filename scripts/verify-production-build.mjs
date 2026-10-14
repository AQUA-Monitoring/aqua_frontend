import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const productionApiUrl = 'https://api-aqua.michalski.app/api/'
const configuredApiUrl = process.env.VITE_BASE_URL ?? ''
const distDir = resolve(process.env.AQUA_DIST_DIR ?? 'dist')

if (configuredApiUrl !== productionApiUrl) {
  throw new Error(
    `VITE_BASE_URL must be exactly ${productionApiUrl}; received ${configuredApiUrl || '<empty>'}`,
  )
}

const assetsDir = join(distDir, 'assets')
const assetNames = await readdir(assetsDir)
const javascriptNames = assetNames.filter((name) => name.endsWith('.js'))
const javascript = await Promise.all(
  javascriptNames.map((name) => readFile(join(assetsDir, name), 'utf8')),
)

if (!javascript.some((source) => source.includes(productionApiUrl))) {
  throw new Error(`Production API URL was not found in JavaScript assets under ${assetsDir}`)
}

const relativeBaseUrl = /baseURL\s*:\s*["'`]\/api\/["'`]/
if (javascript.some((source) => relativeBaseUrl.test(source))) {
  throw new Error('A JavaScript asset still configures Axios with the relative /api/ base URL')
}

console.log(`Production build verified: API requests use ${productionApiUrl}`)
