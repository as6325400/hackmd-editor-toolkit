import type { LanguageCode, TranslationKey } from '../i18n/messages'

export type FeatureId = 'hackmdImageResize' | 'showResizeHints' | 'hackmdTableInsert'

export type FeatureDefinition = {
  id: FeatureId
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  defaultEnabled: boolean
  parentId?: FeatureId
}

export type ExtensionSettings = {
  schemaVersion: number
  language: LanguageCode
  features: Record<FeatureId, boolean>
}
