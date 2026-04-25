import { DEFAULT_SETTINGS } from './defaults'
import type { ExtensionSettings } from '../types/settings'

export function normalizeSettings(input: unknown): ExtensionSettings {
  const candidate = (input ?? {}) as Partial<ExtensionSettings>

  return {
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    features: {
      ...DEFAULT_SETTINGS.features,
      ...(candidate.features ?? {}),
    },
  }
}
