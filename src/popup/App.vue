<script setup lang="ts">
import { onMounted } from 'vue'
import FeatureToggleList from './components/FeatureToggleList.vue'
import { useSettings } from './composables/useSettings'
import type { LanguageCode } from '../shared/i18n/messages'

const {
  errorMessage,
  features,
  language,
  languageOptions,
  load,
  loading,
  savingLanguage,
  setLanguage,
  t,
  toggleFeature,
} = useSettings()

onMounted(() => {
  void load()
})

function onLanguageChange(event: Event) {
  void setLanguage((event.target as HTMLSelectElement).value as LanguageCode)
}
</script>

<template>
  <main class="w-[380px] bg-slate-950 text-slate-100">
    <section class="border-b border-slate-800 bg-gradient-to-br from-brand-700 via-brand-600 to-slate-900 p-5">
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-brand-100/90">
        {{ t('app.brand') }}
      </p>
      <h1 class="mt-2 text-xl font-bold text-white">
        {{ t('app.title') }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-brand-50/90">
        {{ t('app.description') }}
      </p>
    </section>

    <section class="space-y-4 p-4">
      <div class="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
        <label
          class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          for="language"
        >
          {{ t('settings.language') }}
        </label>
        <select
          id="language"
          :disabled="savingLanguage"
          :value="language"
          class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          @change="onLanguageChange"
        >
          <option
            v-for="option in languageOptions"
            :key="option.code"
            :value="option.code"
          >
            {{ option.label }}
          </option>
        </select>
        <p class="mt-2 text-xs leading-5 text-slate-400">
          {{ t('settings.languageHelp') }}
        </p>
      </div>

      <div class="rounded-lg border border-brand-500/20 bg-brand-500/10 p-4 text-xs leading-5 text-brand-50">
        {{ t('app.notice') }}
      </div>

      <p
        v-if="loading"
        class="text-sm text-slate-300"
      >
        {{ t('app.loading') }}
      </p>

      <p
        v-else-if="errorMessage"
        class="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <FeatureToggleList
        v-else
        :features="features"
        :off-label="t('feature.statusOff')"
        :on-label="t('feature.statusOn')"
        @toggle="toggleFeature"
      />
    </section>
  </main>
</template>
