<script setup lang="ts">
import { onMounted } from 'vue'
import FeatureToggleList from './components/FeatureToggleList.vue'
import { useSettings } from './composables/useSettings'

const { errorMessage, features, load, loading, toggleFeature } = useSettings()

onMounted(() => {
  void load()
})
</script>

<template>
  <main class="w-[380px] bg-slate-950 text-slate-100">
    <section class="border-b border-slate-800 bg-gradient-to-br from-brand-700 via-brand-600 to-slate-900 p-5">
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-brand-100/90">
        HackMD Editor Toolkit
      </p>
      <h1 class="mt-2 text-xl font-bold text-white">
        功能開關
      </h1>
      <p class="mt-2 text-sm leading-6 text-brand-50/90">
        針對 HackMD 的功能採模組化開關，之後新增新功能時可直接出現在這裡，並自動套用預設開啟值。
      </p>
    </section>

    <section class="space-y-4 p-4">
      <div
        class="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-xs leading-5 text-brand-50"
      >
        目前首個功能會在 HackMD 雙欄模式的預覽圖片上加入拖曳縮放控制，並把結果寫回 markdown 圖片語法。
      </div>

      <p
        v-if="loading"
        class="text-sm text-slate-300"
      >
        讀取設定中...
      </p>

      <p
        v-else-if="errorMessage"
        class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <FeatureToggleList
        v-else
        :features="features"
        @toggle="toggleFeature"
      />
    </section>
  </main>
</template>
