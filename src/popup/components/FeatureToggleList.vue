<script setup lang="ts">
import type { FeatureId } from '../../shared/types/settings'

defineProps<{
  features: Array<{
    id: FeatureId
    title: string
    description: string
    enabled: boolean
    saving: boolean
  }>
}>()

const emit = defineEmits<{
  toggle: [featureId: FeatureId, enabled: boolean]
}>()
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="feature in features"
      :key="feature.id"
      class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20"
    >
      <label class="flex cursor-pointer items-start gap-3">
        <input
          :checked="feature.enabled"
          :disabled="feature.saving"
          class="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
          type="checkbox"
          @change="emit('toggle', feature.id, ($event.target as HTMLInputElement).checked)"
        >

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-white">
              {{ feature.title }}
            </p>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="feature.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'"
            >
              {{ feature.enabled ? 'ON' : 'OFF' }}
            </span>
          </div>
          <p class="mt-1 text-xs leading-5 text-slate-300">
            {{ feature.description }}
          </p>
        </div>
      </label>
    </li>
  </ul>
</template>
