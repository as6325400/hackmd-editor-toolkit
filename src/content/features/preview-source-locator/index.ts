import type { FeatureId } from '../../../shared/types/settings'

const FEATURE_ID: FeatureId = 'previewSourceLocator'
const BRIDGE_SCRIPT_ID = 'hackmd-resize-toolkit-page-bridge'
const BRIDGE_REQUEST_EVENT = 'hackmd-resize-toolkit:request'
const BRIDGE_RESPONSE_EVENT = 'hackmd-resize-toolkit:response'
const PREVIEW_SELECTORS = [
  '.ui-view-area .markdown-body',
  '.view-area .markdown-body',
  '.markdown-body',
]
const MIN_SELECTION_LENGTH = 2
const BLOCK_SELECTOR = 'p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, pre, code'
const CONTEXT_WINDOW = 120

let bridgeReadyPromise: Promise<void> | null = null
let selectionTimer: number | null = null
let latestSelectionKey = ''

export const previewSourceLocatorFeature = {
  id: FEATURE_ID,
  matches(location: Location) {
    return location.hostname === 'hackmd.io'
  },
  run() {
    void ensurePageBridgeInjected()
    document.addEventListener('selectionchange', queueSelectionLookup)
    window.addEventListener('blur', clearHighlight)
  },
  stop() {
    document.removeEventListener('selectionchange', queueSelectionLookup)
    window.removeEventListener('blur', clearHighlight)

    if (selectionTimer !== null) {
      window.clearTimeout(selectionTimer)
      selectionTimer = null
    }

    latestSelectionKey = ''
    void clearMarkdownSourceHighlight()
  },
}

function queueSelectionLookup() {
  if (selectionTimer !== null) {
    window.clearTimeout(selectionTimer)
  }

  selectionTimer = window.setTimeout(() => {
    selectionTimer = null
    void updateSelectionLookup()
  }, 80)
}

async function updateSelectionLookup() {
  const selection = window.getSelection()

  if (!selection || selection.isCollapsed || !isSelectionInsidePreview(selection)) {
    latestSelectionKey = ''
    await clearMarkdownSourceHighlight()
    return
  }

  const context = getSelectionContext(selection)

  if (context.text.length < MIN_SELECTION_LENGTH) {
    latestSelectionKey = ''
    await clearMarkdownSourceHighlight()
    return
  }

  const selectionKey = JSON.stringify(context)

  if (selectionKey === latestSelectionKey) {
    return
  }

  latestSelectionKey = selectionKey
  try {
    await callPageBridge('locateMarkdownSource', context)
  } catch {
    latestSelectionKey = ''
  }
}

function isSelectionInsidePreview(selection: Selection) {
  const previewRoot = getPreviewRoot()

  if (!previewRoot || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  return previewRoot.contains(range.commonAncestorContainer)
}

function getPreviewRoot() {
  for (const selector of PREVIEW_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element) {
      return element
    }
  }

  return null
}

function normalizeSelectionText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function getSelectionContext(selection: Selection) {
  const range = selection.getRangeAt(0)
  const text = normalizeSelectionText(selection.toString())
  const block = getSelectionBlock(range)
  const blockText = normalizeSelectionText(block?.innerText || block?.textContent || '')
  const offset = block ? getRangeOffsetInBlock(block, range) : -1
  const beforeText = offset >= 0 ? normalizeSelectionText(blockText.slice(Math.max(0, offset - CONTEXT_WINDOW), offset)) : ''
  const afterText =
    offset >= 0 ? normalizeSelectionText(blockText.slice(offset + text.length, offset + text.length + CONTEXT_WINDOW)) : ''

  return {
    afterText,
    beforeText,
    blockText,
    text,
  }
}

function getSelectionBlock(range: Range) {
  const container = range.commonAncestorContainer
  const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement
  const block = element?.closest<HTMLElement>(BLOCK_SELECTOR)
  return block && getPreviewRoot()?.contains(block) ? block : null
}

function getRangeOffsetInBlock(block: HTMLElement, range: Range) {
  const beforeRange = document.createRange()
  beforeRange.selectNodeContents(block)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  return normalizeSelectionText(beforeRange.toString()).length
}

async function clearHighlight() {
  latestSelectionKey = ''
  await clearMarkdownSourceHighlight()
}

async function clearMarkdownSourceHighlight() {
  try {
    await callPageBridge('clearMarkdownSourceHighlight')
  } catch {
    // HackMD can briefly fire selection events before the editor instance is ready.
  }
}

async function callPageBridge(type: 'locateMarkdownSource' | 'clearMarkdownSourceHighlight', payload?: unknown) {
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

      if (customEvent.detail.ok) {
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
          payload,
          type,
        },
      }),
    )
  })
}

function ensurePageBridgeInjected(): Promise<void> {
  if (bridgeReadyPromise) {
    return bridgeReadyPromise
  }

  bridgeReadyPromise = new Promise((resolve, reject) => {
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

  return bridgeReadyPromise
}
