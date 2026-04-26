import type { ExtensionSettings, FeatureId } from '../../../shared/types/settings'
import { getMessage, type TranslationKey } from '../../../shared/i18n/messages'

const FEATURE_ID: FeatureId = 'hackmdImageResize'
const OVERLAY_ATTR = 'data-hackmd-resize-overlay'
const ACTIVE_CLASS = 'hackmd-resize-active'
const HANDLE_SIZE = 14
const DEBUG_PREFIX = '[HackMD Resize Toolkit]'
const PREVIEW_SELECTORS = [
  '.ui-view-area .markdown-body',
  '.view-area .markdown-body',
  '.markdown-body',
]
const EDITOR_SELECTORS = [
  '.ui-edit-area .CodeMirror',
  '.CodeMirror',
  '.CodeMirror-code',
  'textarea',
]
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(([^\s)]+)(?:\s+=([^\s)]+))?\)/g
const BRIDGE_SCRIPT_ID = 'hackmd-resize-toolkit-page-bridge'
const BRIDGE_REQUEST_EVENT = 'hackmd-resize-toolkit:request'
const BRIDGE_RESPONSE_EVENT = 'hackmd-resize-toolkit:response'

let styleInjected = false
let observer: MutationObserver | null = null
let bridgeReadyPromise: Promise<void> | null = null
let latestSettings: ExtensionSettings | null = null

export const hackmdImageResizeFeature = {
  id: FEATURE_ID,
  matches(location: Location) {
    return location.hostname === 'hackmd.io'
  },
  run(settings: ExtensionSettings) {
    latestSettings = settings
    debug('feature started', settings.features)
    injectStyles()
    void ensurePageBridgeInjected()
    startPreviewObserver(settings)
    refreshResizeHandles(settings)
  },
  stop() {
    observer?.disconnect()
    observer = null
    removeAllOverlays()
  },
}

function injectStyles() {
  if (styleInjected) {
    return
  }

  const style = document.createElement('style')
  style.textContent = `
    [${OVERLAY_ATTR}] {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      border: 1px solid rgba(124, 58, 237, 0.45);
      border-radius: 6px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    [${OVERLAY_ATTR}]::before {
      content: attr(data-label);
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.85);
      color: #e2e8f0;
      font-size: 11px;
      line-height: 1.3;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .hackmd-resize-wrapper:hover [${OVERLAY_ATTR}]::before,
    .${ACTIVE_CLASS} [${OVERLAY_ATTR}]::before {
      opacity: 1;
    }

    .hackmd-resize-wrapper {
      position: relative;
      display: inline-block;
      overflow: visible;
      vertical-align: top;
    }

    .hackmd-resize-wrapper img {
      display: block;
      max-width: none;
      height: auto;
    }

    .hackmd-resize-handle {
      position: absolute;
      right: -7px;
      bottom: -7px;
      width: ${HANDLE_SIZE}px;
      height: ${HANDLE_SIZE}px;
      border-radius: 999px;
      border: 2px solid #ffffff;
      background: #7c3aed;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.35);
      cursor: nwse-resize;
      pointer-events: auto;
      z-index: 3;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .hackmd-resize-wrapper .hackmd-resize-handle {
      opacity: 1;
      transition: opacity 0.15s ease;
    }

    .hackmd-resize-wrapper:not([data-show-hint='true']) .hackmd-resize-handle,
    .hackmd-resize-wrapper:not([data-show-hint='true']) [data-hackmd-resize-overlay] {
      opacity: 0;
    }

    .hackmd-resize-wrapper:hover .hackmd-resize-handle,
    .${ACTIVE_CLASS} .hackmd-resize-handle {
      opacity: 1;
    }
  `

  document.head.append(style)
  styleInjected = true
}

function startPreviewObserver(settings: ExtensionSettings) {
  if (observer) {
    observer.disconnect()
  }

  observer = new MutationObserver(() => {
    refreshResizeHandles(latestSettings ?? settings)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function refreshResizeHandles(settings: ExtensionSettings) {
  const previewRoot = getPreviewRoot()
  if (!previewRoot) {
    removeAllOverlays()
    debug('preview root not found')
    return
  }

  const images = previewRoot.querySelectorAll<HTMLImageElement>('img')
  const showHint = settings.features.showResizeHints
  debug('refresh', {
    splitVisible: isSplitEditorVisible(),
    imageCount: images.length,
    showHint,
  })

  images.forEach((image) => {
    if (image.closest('.hackmd-resize-wrapper')) {
      const wrapper = image.closest<HTMLElement>('.hackmd-resize-wrapper')
      if (wrapper) {
        wrapper.dataset.showHint = String(showHint)
      }
      return
    }

    const wrapper = document.createElement('span')
    wrapper.className = 'hackmd-resize-wrapper'
    wrapper.dataset.showHint = String(showHint)

    image.parentNode?.insertBefore(wrapper, image)
    wrapper.append(image)
    syncWrapperToImageBox(image, wrapper)

    const overlay = document.createElement('span')
    overlay.setAttribute(OVERLAY_ATTR, 'true')
    overlay.setAttribute('data-label', t('content.imageResize.defaultLabel'))

    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = 'hackmd-resize-handle'
    handle.title = t('content.imageResize.handleTitle')

    handle.addEventListener('pointerdown', (event) => {
      beginResize(event, image, wrapper)
    })

    wrapper.append(overlay, handle)
  })
}

function removeAllOverlays() {
  document.querySelectorAll<HTMLElement>('.hackmd-resize-wrapper').forEach((wrapper) => {
    const image = wrapper.querySelector('img')
    if (!image || !wrapper.parentNode) {
      wrapper.remove()
      return
    }

    wrapper.parentNode.insertBefore(image, wrapper)
    wrapper.remove()
  })
}

function beginResize(event: PointerEvent, image: HTMLImageElement, wrapper: HTMLElement) {
  event.preventDefault()
  event.stopPropagation()

  const imageUrl = image.currentSrc || image.getAttribute('src') || ''
  const markdownSnapshotPromise = imageUrl ? getPageMarkdownSnapshot(imageUrl) : Promise.resolve(null)
  const session: ResizeSession = {
    lastAppliedWidth: null,
    patchTarget: null,
    snapshot: null,
  }

  void markdownSnapshotPromise.then((snapshot) => {
    session.snapshot = snapshot
    session.patchTarget = snapshot?.match ?? null
  })

  debug('pointerdown', { imageUrl })

  syncWrapperToImageBox(image, wrapper)

  const rect = image.getBoundingClientRect()
  const startX = event.clientX
  const startWidth = Math.max(40, Math.round(rect.width || image.width || image.naturalWidth || 40))
  const maxWidth = getMaxResizeWidth(image, startWidth)
  wrapper.classList.add(ACTIVE_CLASS)

  const naturalRatio = rect.width > 0 && rect.height > 0 ? rect.height / rect.width : getImageRatio(image)

  const applyPreviewWidth = (width: number) => {
    wrapper.style.width = `${width}px`
    wrapper.style.height = `${Math.round(width * naturalRatio)}px`
    image.style.width = '100%'
    image.style.height = '100%'
    image.style.maxWidth = 'none'
    image.style.objectFit = 'fill'
    image.style.display = 'block'
  }

  applyPreviewWidth(startWidth)

  const move = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startX
    const nextWidth = clamp(Math.round(startWidth + deltaX), 40, maxWidth)
    applyPreviewWidth(nextWidth)
    overlayLabel(wrapper, `${nextWidth}px`)

    session.lastAppliedWidth = nextWidth
  }

  const up = async () => {
    wrapper.classList.remove(ACTIVE_CLASS)

    if (session.lastAppliedWidth === null) {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      return
    }

    if (session.lastAppliedWidth !== null) {
      applyPreviewWidth(session.lastAppliedWidth)
    }

    if (session.patchTarget && session.lastAppliedWidth !== null) {
      const didWrite = await replacePageMarkdownRange(
        session.patchTarget.start,
        session.patchTarget.end,
        buildReplacementForWidth(session.patchTarget, session.lastAppliedWidth),
      )

      if (didWrite) {
        overlayLabel(wrapper, `${session.lastAppliedWidth}${t('content.imageResize.saved')}`)
      } else {
        overlayLabel(wrapper, `${session.lastAppliedWidth}${t('content.imageResize.writeFailed')}`)
      }
    } else if (session.lastAppliedWidth !== null) {
      overlayLabel(wrapper, `${session.lastAppliedWidth}${t('content.imageResize.matchFailed')}`)
    }

    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}

function overlayLabel(wrapper: HTMLElement, message: string) {
  const overlay = wrapper.querySelector<HTMLElement>(`[${OVERLAY_ATTR}]`)
  overlay?.setAttribute('data-label', message)
}

function getPreviewRoot(): HTMLElement | null {
  for (const selector of PREVIEW_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element) {
      return element
    }
  }

  return null
}

function isSplitEditorVisible() {
  const preview = getPreviewRoot()
  const editor = EDITOR_SELECTORS
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .find((element) => Boolean(element))

  if (!preview || !editor) {
    return false
  }

  return isVisible(preview) && isVisible(editor)
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
}

type MarkdownImageMatch = {
  fullMatch: string
  imageUrl: string
  sizeToken?: string
  start: number
  end: number
}

type MarkdownSnapshot = {
  markdown: string
  match: MarkdownImageMatch | null
}

type ResizeSession = {
  lastAppliedWidth: number | null
  patchTarget: MarkdownImageMatch | null
  snapshot: MarkdownSnapshot | null
}

async function getPageMarkdownSnapshot(imageUrl: string): Promise<MarkdownSnapshot | null> {
  const markdown = await getPageMarkdown()
  if (!markdown) {
    return null
  }

  return {
    markdown,
    match: findMarkdownImage(markdown, imageUrl),
  }
}

function findMarkdownImage(markdown: string, imageUrl: string): MarkdownImageMatch | null {
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const fullMatch = match[0]
    const matchedUrl = match[1]

    if (!isSameImageSource(matchedUrl, imageUrl)) {
      continue
    }

    return {
      fullMatch,
      imageUrl: matchedUrl,
      sizeToken: match[2],
      start: match.index ?? 0,
      end: (match.index ?? 0) + fullMatch.length,
    }
  }

  return null
}

function isSameImageSource(markdownUrl: string, renderedUrl: string) {
  if (markdownUrl === renderedUrl) {
    return true
  }

  try {
    const normalizedMarkdown = new URL(markdownUrl, window.location.href).toString()
    const normalizedRendered = new URL(renderedUrl, window.location.href).toString()
    return normalizedMarkdown === normalizedRendered
  } catch {
    return false
  }
}

function syncWrapperToImageBox(image: HTMLImageElement, wrapper: HTMLElement) {
  const rect = image.getBoundingClientRect()
  const width = rect.width || image.width || image.naturalWidth
  const height = rect.height || image.height || image.naturalHeight

  if (width > 0) {
    wrapper.style.width = `${width}px`
  }

  if (height > 0) {
    wrapper.style.height = `${height}px`
  }

  image.style.width = '100%'
  image.style.height = '100%'
  image.style.maxWidth = 'none'
  image.style.objectFit = 'fill'
  image.style.display = 'block'
}

function getImageRatio(image: HTMLImageElement) {
  const width = image.naturalWidth || image.width || 1
  const height = image.naturalHeight || image.height || 1
  return height / width
}

function getMaxResizeWidth(image: HTMLImageElement, startWidth: number) {
  const previewWidth = getPreviewRoot()?.getBoundingClientRect().width ?? 0
  const naturalWidth = image.naturalWidth || image.width || 0
  const viewportWidth = window.innerWidth || 0
  return Math.round(Math.max(800, startWidth * 8, naturalWidth * 4, previewWidth * 2, viewportWidth * 2))
}

function buildReplacementForWidth(match: MarkdownImageMatch, width: number) {
  return match.sizeToken
    ? match.fullMatch.replace(`=${match.sizeToken}`, `=${width}x`)
    : match.fullMatch.replace(`(${match.imageUrl})`, `(${match.imageUrl} =${width}x)`)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function getPageMarkdown(): Promise<string> {
  const result = await callPageBridge('getMarkdown')
  return typeof result === 'string' ? result : ''
}

async function replacePageMarkdownRange(start: number, end: number, text: string): Promise<boolean> {
  const result = await callPageBridge('replaceRange', { end, start, text })
  return result === true
}

async function callPageBridge(type: 'getMarkdown' | 'setMarkdown' | 'replaceRange', payload?: unknown): Promise<unknown> {
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

function debug(message: string, payload?: unknown) {
  console.debug(DEBUG_PREFIX, message, payload)
}

function t(key: TranslationKey) {
  return getMessage(latestSettings?.language ?? 'en', key)
}

