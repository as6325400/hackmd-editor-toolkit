import { DEFAULT_SETTINGS } from './defaults'
import type { ExtensionSettings } from '../types/settings'
import { languageDefinitions, type LanguageCode } from '../i18n/messages'

export function normalizeSettings(input: unknown): ExtensionSettings {
  const candidate = (input ?? {}) as Partial<ExtensionSettings>
  const fallbackLanguage = getDefaultLanguage()
  const language: LanguageCode = languageDefinitions.some((definition) => definition.code === candidate.language)
    ? (candidate.language as LanguageCode)
    : fallbackLanguage

  return {
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    language,
    features: {
      ...DEFAULT_SETTINGS.features,
      ...(candidate.features ?? {}),
    },
  }
}

function getDefaultLanguage(): LanguageCode {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en'
  }

  return DEFAULT_SETTINGS.language
}
