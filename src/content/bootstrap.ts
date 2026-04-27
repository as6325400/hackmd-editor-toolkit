import { contentFeatures } from './features'
import type { ExtensionSettings } from '../shared/types/settings'

type FeatureModule = (typeof contentFeatures)[number]

const activeFeatures = new Map<FeatureModule['id'], FeatureModule>()
const BRIDGE_SCRIPT_ID = 'hackmd-resize-toolkit-page-bridge'
const BRIDGE_REQUEST_EVENT = 'hackmd-resize-toolkit:request'
const BRIDGE_RESPONSE_EVENT = 'hackmd-resize-toolkit:response'

export async function bootstrapFeatures(settings: ExtensionSettings) {
  for (const feature of contentFeatures) {
    if (!feature.matches(window.location)) {
      continue
    }

    if (settings.features[feature.id]) {
      feature.run(settings)
      activeFeatures.set(feature.id, feature)
      continue
    }

    if (activeFeatures.has(feature.id)) {
      feature.stop?.()
      activeFeatures.delete(feature.id)
    }
  }
}

export async function getMarkdownForPdfExport() {
  const markdown = await callPageBridge('getMarkdown')

  return {
    markdown,
    title: document.title.replace(/\s*-\s*HackMD\s*$/i, '').trim() || 'HackMD Export',
    url: window.location.href,
  }
}

export async function openPdfExportFromPage() {
  const payload = await getMarkdownForPdfExport()
  const response = await chrome.runtime.sendMessage({
    payload,
    type: 'openPdfExport',
  })

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to open PDF export')
  }
}

async function callPageBridge(type: 'getMarkdown'): Promise<string> {
  await ensurePageBridgeInjected()

  const requestId = crypto.randomUUID()

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Page bridge timeout for ${type}`))
    }, 2000)

    const cleanup = () => {
      window.clearTimeout(timeout)
      document.removeEventListener(BRIDGE_RESPONSE_EVENT, onResponse as EventListener)
    }

    const onResponse = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; ok: boolean; result?: unknown; error?: string }>
      if (customEvent.detail?.id !== requestId) {
        return
      }

      cleanup()

      if (customEvent.detail.ok && typeof customEvent.detail.result === 'string') {
        resolve(customEvent.detail.result)
      } else {
        reject(new Error(customEvent.detail.error || `Page bridge failed for ${type}`))
      }
    }

    document.addEventListener(BRIDGE_RESPONSE_EVENT, onResponse as EventListener)
    document.dispatchEvent(
      new CustomEvent(BRIDGE_REQUEST_EVENT, {
        detail: {
          id: requestId,
          type,
        },
      }),
    )
  })
}

function ensurePageBridgeInjected(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(BRIDGE_SCRIPT_ID) as HTMLScriptElement | null
    if (existing?.dataset.loaded === 'true') {
      resolve()
      return
    }

    const script = existing ?? document.createElement('script')
    script.id = BRIDGE_SCRIPT_ID
    script.src = chrome.runtime.getURL('page-bridge.js')

    const onLoad = () => {
      script.dataset.loaded = 'true'
      resolve()
    }

    const onError = () => {
      reject(new Error('Failed to inject page bridge'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existing) {
      ;(document.head || document.documentElement).append(script)
    }
  })
}
