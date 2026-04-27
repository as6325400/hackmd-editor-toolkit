import { openPdfExportFromPage } from '../../bootstrap'
import type { FeatureId } from '../../../shared/types/settings'

const FEATURE_ID: FeatureId = 'pdfExportButton'
const BUTTON_ATTR = 'data-hackmd-pdf-export-button'
const STYLE_ID = 'hackmd-pdf-export-style'

let button: HTMLButtonElement | null = null

export const pdfExportButtonFeature = {
  id: FEATURE_ID,
  matches(location: Location) {
    return location.hostname === 'hackmd.io'
  },
  run() {
    injectStyles()
    mountButton()
  },
  stop() {
    button?.remove()
    button = null
    document.querySelectorAll<HTMLElement>(`[${BUTTON_ATTR}]`).forEach((element) => element.remove())
  },
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [${BUTTON_ATTR}] {
      align-items: center;
      background: #6d28d9;
      border: 2px solid #ffffff;
      border-radius: 999px;
      bottom: 28px;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.42);
      color: #ffffff;
      cursor: pointer;
      display: inline-flex;
      font: 800 16px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      gap: 10px;
      height: 52px;
      letter-spacing: 0.01em;
      left: 28px;
      padding: 0 22px;
      position: fixed;
      z-index: 2147483647;
    }

    [${BUTTON_ATTR}]:hover {
      background: #5b21b6;
      transform: translateY(-2px);
    }

    [${BUTTON_ATTR}][data-loading='true'] {
      cursor: wait;
      opacity: 0.76;
      transform: none;
    }

    [${BUTTON_ATTR}] svg {
      height: 22px;
      width: 22px;
    }

    [${BUTTON_ATTR}] span {
      pointer-events: none;
    }
  `

  document.head.append(style)
}

function mountButton() {
  if (button?.isConnected || document.querySelector(`[${BUTTON_ATTR}]`)) {
    return
  }

  button = createButton()
  document.body.append(button)
}

function createButton() {
  const nextButton = document.createElement('button')
  nextButton.type = 'button'
  nextButton.setAttribute(BUTTON_ATTR, 'true')
  nextButton.setAttribute('aria-label', '匯出成 PDF')
  nextButton.title = '匯出成 PDF'
  nextButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <path d="M14 2v6h6"></path>
      <path d="M8 13h8M8 17h5"></path>
    </svg>
    <span>匯出 PDF</span>
  `

  nextButton.addEventListener('click', () => {
    void exportPdf()
  })

  return nextButton
}

function setLoading(isLoading: boolean) {
  document.querySelectorAll<HTMLButtonElement>(`[${BUTTON_ATTR}]`).forEach((element) => {
    element.dataset.loading = String(isLoading)
    element.disabled = isLoading
  })
}

async function exportPdf() {
  if (document.querySelector(`[${BUTTON_ATTR}][data-loading='true']`)) {
    return
  }

  setLoading(true)

  try {
    await openPdfExportFromPage()
  } finally {
    setLoading(false)
  }
}
