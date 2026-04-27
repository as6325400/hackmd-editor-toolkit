import { ensureDefaultSettings } from '../shared/storage/settings'

const EXPORT_STORAGE_PREFIX = 'pdfExport:'

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaultSettings()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureDefaultSettings()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'openPdfExport') {
    return false
  }

  void openPdfExport(message.payload)
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      })
    })

  return true
})

async function openPdfExport(payload?: { markdown?: string; title?: string; url?: string }) {
  if (!payload?.markdown) {
    throw new Error('No markdown content provided for PDF export')
  }

  const exportId = crypto.randomUUID()
  await chrome.storage.session.set({
    [`${EXPORT_STORAGE_PREFIX}${exportId}`]: {
      createdAt: Date.now(),
      markdown: payload.markdown,
      title: payload.title || 'HackMD Export',
      url: payload.url || '',
    },
  })

  await chrome.tabs.create({
    url: chrome.runtime.getURL(`pdf-export.html?id=${encodeURIComponent(exportId)}`),
  })

  return { ok: true }
}
