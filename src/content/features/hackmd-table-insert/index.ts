import type { FeatureId } from '../../../shared/types/settings'

const FEATURE_ID: FeatureId = 'hackmdTableInsert'
const BUTTON_ATTR = 'data-hackmd-table-insert-button'
const FALLBACK_BUTTON_ATTR = 'data-hackmd-table-insert-fallback-button'
const PICKER_ATTR = 'data-hackmd-table-insert-picker'
const STYLE_ID = 'hackmd-table-insert-style'
const BRIDGE_SCRIPT_ID = 'hackmd-resize-toolkit-page-bridge'
const BRIDGE_REQUEST_EVENT = 'hackmd-resize-toolkit:request'
const BRIDGE_RESPONSE_EVENT = 'hackmd-resize-toolkit:response'
const MAX_ROWS = 10
const MAX_COLUMNS = 10

let observer: MutationObserver | null = null
let bridgeReadyPromise: Promise<void> | null = null
let currentPicker: HTMLElement | null = null
const managedButtonControllers = new WeakMap<HTMLElement, AbortController>()

export const hackmdTableInsertFeature = {
  id: FEATURE_ID,
  matches(location: Location) {
    return location.hostname === 'hackmd.io'
  },
  run() {
    injectStyles()
    void ensurePageBridgeInjected()
    mountToolbarButton()
    startToolbarObserver()
    document.addEventListener('pointerdown', closePickerOnOutsidePointer)
    window.addEventListener('resize', closePicker)
    window.addEventListener('scroll', closePicker, true)
  },
  stop() {
    observer?.disconnect()
    observer = null
    document.removeEventListener('pointerdown', closePickerOnOutsidePointer)
    window.removeEventListener('resize', closePicker)
    window.removeEventListener('scroll', closePicker, true)
    closePicker()
    document.querySelectorAll<HTMLElement>(`[${BUTTON_ATTR}]`).forEach((button) => {
      managedButtonControllers.get(button)?.abort()
      managedButtonControllers.delete(button)
      button.removeAttribute(BUTTON_ATTR)
      button.removeAttribute('aria-expanded')
    })
    document.querySelectorAll<HTMLElement>(`[${FALLBACK_BUTTON_ATTR}]`).forEach((button) => button.remove())
  },
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [${BUTTON_ATTR}][${FALLBACK_BUTTON_ATTR}] {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 4px;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      margin: 0 2px;
      padding: 0 8px;
      vertical-align: middle;
      width: 34px;
    }

    [${BUTTON_ATTR}]:hover,
    [${BUTTON_ATTR}][aria-expanded='true'] {
      background: rgba(148, 163, 184, 0.18);
    }

    [${BUTTON_ATTR}][${FALLBACK_BUTTON_ATTR}] svg {
      height: 17px;
      pointer-events: none;
      width: 17px;
    }

    [${PICKER_ATTR}] {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 8px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
      color: #111827;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 10px;
      position: fixed;
      user-select: none;
      z-index: 2147483647;
    }

    .hackmd-table-insert-grid {
      display: grid;
      gap: 3px;
      grid-template-columns: repeat(${MAX_COLUMNS}, 18px);
    }

    .hackmd-table-insert-cell {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
      box-sizing: border-box;
      height: 18px;
      padding: 0;
      width: 18px;
    }

    .hackmd-table-insert-cell.is-selected {
      background: #dbeafe;
      border-color: #2563eb;
    }

    .hackmd-table-insert-label {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      margin-top: 8px;
      min-height: 17px;
      text-align: center;
    }
  `

  document.head.append(style)
}

function startToolbarObserver() {
  if (observer) {
    observer.disconnect()
  }

  observer = new MutationObserver(() => {
    mountToolbarButton()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function mountToolbarButton() {
  if (document.querySelector(`[${BUTTON_ATTR}]`)) {
    return
  }

  const toolbar = findEditorToolbar()
  if (!toolbar) {
    return
  }

  const existingTableButton = findTableToolbarButton(toolbar)
  if (existingTableButton) {
    setupManagedButton(existingTableButton)
    return
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute(BUTTON_ATTR, 'true')
  button.setAttribute(FALLBACK_BUTTON_ATTR, 'true')
  button.title = '插入表格'
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="5" width="18" height="14" rx="1.5"></rect>
      <path d="M3 10h18M3 15h18M9 5v14M15 5v14"></path>
    </svg>
  `
  setupManagedButton(button)

  const imageButton = findImageToolbarButton(toolbar)
  if (imageButton?.parentElement === toolbar) {
    imageButton.insertAdjacentElement('afterend', button)
    return
  }

  toolbar.append(button)
}

function findEditorToolbar() {
  const directSelectors = [
    '.ui-edit-area .editor-toolbar',
    '.editor-toolbar',
    '.ui-edit-area [role="toolbar"]',
    '[role="toolbar"]',
    '.ui-edit-area .btn-toolbar',
    '.ui-edit-area .navbar',
  ]

  for (const selector of directSelectors) {
    const toolbar = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible)
    if (toolbar) {
      return toolbar
    }
  }

  const imageButton = Array.from(document.querySelectorAll<HTMLElement>('button, a')).find((element) => {
    const label = `${element.title} ${element.getAttribute('aria-label') ?? ''} ${element.className}`.toLowerCase()
    return isVisible(element) && /\b(image|picture|photo|upload)\b|fa-image|glyphicon-picture/.test(label)
  })

  return imageButton?.parentElement ?? null
}

function findImageToolbarButton(toolbar: HTMLElement) {
  return Array.from(toolbar.querySelectorAll<HTMLElement>('button, a')).find((element) => {
    const label = `${element.title} ${element.getAttribute('aria-label') ?? ''} ${element.className}`.toLowerCase()
    return /\b(image|picture|photo|upload)\b|fa-image|glyphicon-picture/.test(label)
  })
}

function findTableToolbarButton(toolbar: HTMLElement) {
  return Array.from(toolbar.querySelectorAll<HTMLElement>('button, a')).find((element) => {
    const label = `${element.title} ${element.getAttribute('aria-label') ?? ''} ${element.className}`.toLowerCase()
    const iconClass = Array.from(element.querySelectorAll<HTMLElement>('i, span, svg'))
      .map((child) => `${child.className} ${child.getAttribute('data-icon') ?? ''}`)
      .join(' ')
      .toLowerCase()

    return /\btable\b|fa-table|glyphicon-th|mdi-table|icon-table/.test(`${label} ${iconClass}`)
  })
}

function setupManagedButton(button: HTMLElement) {
  if (managedButtonControllers.has(button)) {
    return
  }

  const controller = new AbortController()
  managedButtonControllers.set(button, controller)
  button.setAttribute(BUTTON_ATTR, 'true')
  button.setAttribute('aria-label', button.getAttribute('aria-label') || '插入表格')
  button.setAttribute('aria-expanded', 'false')
  button.title = button.title || '插入表格'

  button.addEventListener(
    'pointerdown',
    (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true, signal: controller.signal },
  )

  button.addEventListener(
    'click',
    (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      togglePicker(button)
    },
    { capture: true, signal: controller.signal },
  )
}

function togglePicker(button: HTMLElement) {
  if (currentPicker) {
    closePicker()
    return
  }

  openPicker(button)
}

function openPicker(button: HTMLElement) {
  closePicker()
  button.setAttribute('aria-expanded', 'true')

  const picker = document.createElement('div')
  picker.setAttribute(PICKER_ATTR, 'true')

  const grid = document.createElement('div')
  grid.className = 'hackmd-table-insert-grid'

  const label = document.createElement('div')
  label.className = 'hackmd-table-insert-label'
  label.textContent = '1 x 1'

  for (let row = 1; row <= MAX_ROWS; row += 1) {
    for (let column = 1; column <= MAX_COLUMNS; column += 1) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'hackmd-table-insert-cell'
      cell.setAttribute('aria-label', `${column} 欄 ${row} 列`)
      cell.dataset.row = String(row)
      cell.dataset.column = String(column)
      cell.addEventListener('pointerenter', () => updateSelection(picker, column, row))
      cell.addEventListener('focus', () => updateSelection(picker, column, row))
      cell.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        void insertTable(column, row)
      })
      grid.append(cell)
    }
  }

  picker.append(grid, label)
  document.body.append(picker)
  currentPicker = picker
  updateSelection(picker, 1, 1)
  positionPicker(button, picker)
}

function positionPicker(button: HTMLElement, picker: HTMLElement) {
  const rect = button.getBoundingClientRect()
  const pickerRect = picker.getBoundingClientRect()
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - pickerRect.width - 8)
  const top = Math.min(rect.bottom + 6, window.innerHeight - pickerRect.height - 8)
  picker.style.left = `${left}px`
  picker.style.top = `${Math.max(8, top)}px`
}

function updateSelection(picker: HTMLElement, columns: number, rows: number) {
  picker.dataset.columns = String(columns)
  picker.dataset.rows = String(rows)
  picker.querySelectorAll<HTMLElement>('.hackmd-table-insert-cell').forEach((cell) => {
    const cellColumn = Number(cell.dataset.column)
    const cellRow = Number(cell.dataset.row)
    cell.classList.toggle('is-selected', cellColumn <= columns && cellRow <= rows)
  })

  const label = picker.querySelector<HTMLElement>('.hackmd-table-insert-label')
  if (label) {
    label.textContent = `${columns} x ${rows}`
  }
}

async function insertTable(columns: number, rows: number) {
  const tableMarkdown = buildMarkdownTable(columns, rows)
  closePicker()
  await callPageBridge('insertAtCursor', { text: tableMarkdown })
}

function buildMarkdownTable(columns: number, rows: number) {
  const safeColumns = clamp(columns, 1, MAX_COLUMNS)
  const safeRows = clamp(rows, 1, MAX_ROWS)
  const row = `| ${Array.from({ length: safeColumns }, () => ' ').join(' | ')} |`
  const separator = `| ${Array.from({ length: safeColumns }, () => '---').join(' | ')} |`
  const bodyRows = Array.from({ length: Math.max(0, safeRows - 1) }, () => row)
  return `\n${[row, separator, ...bodyRows].join('\n')}\n`
}

function closePickerOnOutsidePointer(event: PointerEvent) {
  const target = event.target as Node | null
  if (!currentPicker || !target) {
    return
  }

  if (currentPicker.contains(target) || document.querySelector(`[${BUTTON_ATTR}]`)?.contains(target)) {
    return
  }

  closePicker()
}

function closePicker() {
  currentPicker?.remove()
  currentPicker = null
  document.querySelectorAll<HTMLElement>(`[${BUTTON_ATTR}]`).forEach((button) => {
    button.setAttribute('aria-expanded', 'false')
  })
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function callPageBridge(type: 'insertAtCursor', payload?: unknown): Promise<unknown> {
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
