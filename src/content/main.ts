import { bootstrapFeatures } from './bootstrap'
import { getSettings } from '../shared/storage/settings'
import { isHackMdPage } from '../shared/utils/browser'

async function applyCurrentSettings() {
  const settings = await getSettings()
  await bootstrapFeatures(settings)
}

async function main() {
  if (!isHackMdPage()) {
    return
  }

  await applyCurrentSettings()

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes.settings) {
      return
    }

    void applyCurrentSettings()
  })
}

void main()
