import { computed, ref } from 'vue'
import { featureDefinitions } from '../../shared/config/features'
import { DEFAULT_SETTINGS } from '../../shared/storage/defaults'
import { getSettings, updateFeatureEnabled, updateLanguage } from '../../shared/storage/settings'
import { getMessage, languageDefinitions, type LanguageCode, type TranslationKey } from '../../shared/i18n/messages'
import type { FeatureId } from '../../shared/types/settings'

const loading = ref(true)
const savingFeature = ref<FeatureId | null>(null)
const savingLanguage = ref(false)
const errorMessage = ref('')
const settings = ref({ ...DEFAULT_SETTINGS })

export function useSettings() {
  const language = computed(() => settings.value.language)

  const t = (key: TranslationKey) => getMessage(language.value, key)

  const features = computed(() =>
    featureDefinitions.map((feature) => ({
      ...feature,
      description: t(feature.descriptionKey),
      enabled: settings.value.features[feature.id],
      saving: savingFeature.value === feature.id,
      title: t(feature.titleKey),
    })),
  )

  async function load() {
    loading.value = true
    errorMessage.value = ''

    try {
      const stored = await getSettings()
      settings.value = stored
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t('app.readError')
    } finally {
      loading.value = false
    }
  }

  async function toggleFeature(featureId: FeatureId, enabled: boolean) {
    savingFeature.value = featureId
    errorMessage.value = ''

    try {
      const next = await updateFeatureEnabled(featureId, enabled)
      settings.value = next
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t('app.updateError')
    } finally {
      savingFeature.value = null
    }
  }

  async function setLanguage(languageCode: LanguageCode) {
    savingLanguage.value = true
    errorMessage.value = ''

    try {
      const next = await updateLanguage(languageCode)
      settings.value = next
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t('app.updateError')
    } finally {
      savingLanguage.value = false
    }
  }

  return {
    errorMessage,
    features,
    language,
    languageOptions: languageDefinitions,
    load,
    loading,
    savingLanguage,
    setLanguage,
    t,
    toggleFeature,
  }
}
