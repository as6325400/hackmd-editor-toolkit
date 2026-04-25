import { DEFAULT_SETTINGS } from './defaults'
import { normalizeSettings } from './migrations'
import type { ExtensionSettings, FeatureId } from '../types/settings'

const STORAGE_KEY = 'settings'
const storageArea = chrome.storage.sync

export async function ensureDefaultSettings(): Promise<ExtensionSettings> {
  const existing = await storageArea.get(STORAGE_KEY)
  const settings = normalizeSettings(existing[STORAGE_KEY])
  const hasStoredSettings = STORAGE_KEY in existing
  const hasAllFeatureKeys = Object.keys(DEFAULT_SETTINGS.features).every((key) => key in settings.features)

  if (!hasStoredSettings || !hasAllFeatureKeys) {
    await storageArea.set({ [STORAGE_KEY]: settings })
  }

  return settings
}

export async function getSettings(): Promise<ExtensionSettings> {
  return ensureDefaultSettings()
}

export async function updateFeatureEnabled(
  featureId: FeatureId,
  enabled: boolean,
): Promise<ExtensionSettings> {
  const current = await getSettings()
  const next: ExtensionSettings = {
    ...current,
    features: {
      ...current.features,
      [featureId]: enabled,
    },
  }

  await storageArea.set({ [STORAGE_KEY]: next })
  return next
}
