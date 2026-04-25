import { contentFeatures } from './features'
import type { ExtensionSettings } from '../shared/types/settings'

type FeatureModule = (typeof contentFeatures)[number]

const activeFeatures = new Map<FeatureModule['id'], FeatureModule>()

export async function bootstrapFeatures(settings: ExtensionSettings) {
  for (const feature of contentFeatures) {
    if (!feature.matches(window.location)) {
      continue
    }

    if (settings.features[feature.id]) {
      feature.run(settings)
      activeFeatures.set(feature.id, feature)
      continue
    }

    if (activeFeatures.has(feature.id)) {
      feature.stop?.()
      activeFeatures.delete(feature.id)
    }
  }
}
