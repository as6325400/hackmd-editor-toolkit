import { computed, ref } from 'vue'
import { featureDefinitions } from '../../shared/config/features'
import { getSettings, updateFeatureEnabled } from '../../shared/storage/settings'
import type { FeatureId } from '../../shared/types/settings'

const loading = ref(true)
const savingFeature = ref<FeatureId | null>(null)
const errorMessage = ref('')
const settings = ref<Record<FeatureId, boolean>>({
  hackmdImageResize: true,
  showResizeHints: true,
})

export function useSettings() {
  const features = computed(() =>
    featureDefinitions.map((feature) => ({
      ...feature,
      enabled: settings.value[feature.id],
      saving: savingFeature.value === feature.id,
    })),
  )

  async function load() {
    loading.value = true
    errorMessage.value = ''

    try {
      const stored = await getSettings()
      settings.value = stored.features
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '無法讀取設定'
    } finally {
      loading.value = false
    }
  }

  async function toggleFeature(featureId: FeatureId, enabled: boolean) {
    savingFeature.value = featureId
    errorMessage.value = ''

    try {
      const next = await updateFeatureEnabled(featureId, enabled)
      settings.value = next.features
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '無法儲存設定'
    } finally {
      savingFeature.value = null
    }
  }

  return {
    errorMessage,
    features,
    load,
    loading,
    toggleFeature,
  }
}
