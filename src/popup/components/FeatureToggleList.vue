<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FeatureId } from '../../shared/types/settings'

type PopupFeature = {
  id: FeatureId
  title: string
  description: string
  enabled: boolean
  saving: boolean
  parentId?: FeatureId
}

const props = defineProps<{
  features: Array<{
    id: FeatureId
    title: string
    description: string
    enabled: boolean
    saving: boolean
    parentId?: FeatureId
  }>
  offLabel: string
  onLabel: string
}>()

const emit = defineEmits<{
  toggle: [featureId: FeatureId, enabled: boolean]
}>()

const expandedGroups = ref<Partial<Record<FeatureId, boolean>>>({})

const featureGroups = computed(() =>
  props.features
    .filter((feature) => !feature.parentId)
    .map((feature) => ({
      children: props.features.filter((child) => child.parentId === feature.id),
      feature,
    })),
)

function emitToggle(feature: PopupFeature, enabled: boolean) {
  emit('toggle', feature.id, enabled)
}

function isExpanded(featureId: FeatureId) {
  return expandedGroups.value[featureId] ?? false
}

function toggleExpanded(featureId: FeatureId) {
  expandedGroups.value[featureId] = !isExpanded(featureId)
}
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="group in featureGroups"
      :key="group.feature.id"
      class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/20 transition-colors hover:border-slate-700"
    >
      <div class="flex items-center gap-3 p-4">
        <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            :checked="group.feature.enabled"
            :disabled="group.feature.saving"
            class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
            type="checkbox"
            @change="emitToggle(group.feature, ($event.target as HTMLInputElement).checked)"
          >

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-white">
                {{ group.feature.title }}
              </p>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="group.feature.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'"
              >
                {{ group.feature.enabled ? onLabel : offLabel }}
              </span>
            </div>
          </div>
        </label>

        <button
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-brand-500/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          type="button"
          :aria-expanded="isExpanded(group.feature.id)"
          :aria-label="group.feature.title"
          @click="toggleExpanded(group.feature.id)"
        >
          <span
            class="h-2 w-2 rotate-45 border-b-2 border-r-2 border-current transition-transform"
            :class="isExpanded(group.feature.id) ? 'rotate-[225deg]' : 'rotate-45'"
          />
        </button>
      </div>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="-translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div
          v-if="isExpanded(group.feature.id)"
          class="border-t border-slate-800 bg-slate-950/45 px-4 py-3"
        >
          <p class="text-xs leading-5 text-slate-300">
            {{ group.feature.description }}
          </p>

          <ul
            v-if="group.children.length"
            class="mt-3 space-y-3"
          >
            <li
              v-for="child in group.children"
              :key="child.id"
            >
              <label
                class="flex items-start gap-3 rounded-md border border-slate-800/80 bg-slate-900/55 p-3 transition"
                :class="group.feature.enabled ? 'cursor-pointer hover:border-slate-700' : 'cursor-not-allowed opacity-50'"
              >
                <input
                  :checked="child.enabled"
                  :disabled="child.saving || !group.feature.enabled"
                  class="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-brand-500"
                  type="checkbox"
                  @change="emitToggle(child, ($event.target as HTMLInputElement).checked)"
                >

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-white">
                      {{ child.title }}
                    </p>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="child.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'"
                    >
                      {{ child.enabled ? onLabel : offLabel }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs leading-5 text-slate-300">
                    {{ child.description }}
                  </p>
                </div>
              </label>
            </li>
          </ul>
        </div>
      </Transition>
    </li>
  </ul>
</template>
