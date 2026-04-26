import { featureDefinitions } from '../config/features'
import type { ExtensionSettings, FeatureId } from '../types/settings'

const featureDefaults = featureDefinitions.reduce<Record<FeatureId, boolean>>((accumulator, feature) => {
  accumulator[feature.id] = feature.defaultEnabled
  return accumulator
}, {} as Record<FeatureId, boolean>)

export const DEFAULT_SETTINGS: ExtensionSettings = {
  schemaVersion: 2,
  language: 'zh-TW',
  features: featureDefaults,
}
