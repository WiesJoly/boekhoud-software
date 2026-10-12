<script setup lang="ts">
import { preference, setPreference, THEMES, type Mode } from '../theme'
import PawIcon from './kitten/PawIcon.vue'

const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Licht' },
  { id: 'dark', label: 'Donker' },
  { id: 'system', label: 'Zoals mijn toestel' },
]
</script>

<template>
  <fieldset class="mb-6">
    <legend class="label">Kleuren</legend>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <label
        v-for="t in THEMES"
        :key="t.id"
        class="flex cursor-pointer flex-col gap-2 rounded-md border border-line bg-surface p-3 text-sm has-checked:border-sage has-checked:ring-2 has-checked:ring-sage-light"
      >
        <input v-model="preference.theme" type="radio" name="theme" :value="t.id" class="sr-only" @change="setPreference({ theme: t.id })" />
        <span class="flex items-center gap-1" aria-hidden="true">
          <span v-for="c in t.swatches" :key="c" class="size-5 rounded-full border border-black/10" :style="{ background: c }" />
          <PawIcon v-if="t.id === 'kitten'" class="ml-1 text-lg" :style="{ color: t.swatches[0] }" />
        </span>
        <span class="font-medium">{{ t.label }}</span>
      </label>
    </div>
  </fieldset>

  <fieldset>
    <legend class="label">Modus</legend>
    <div class="inline-flex flex-wrap rounded-md border border-line bg-surface p-1">
      <label
        v-for="m in MODES"
        :key="m.id"
        class="cursor-pointer rounded px-3 py-1.5 text-sm text-ink-soft has-checked:bg-sage-light has-checked:font-medium has-checked:text-sage-dark"
      >
        <input v-model="preference.mode" type="radio" name="mode" :value="m.id" class="sr-only" @change="setPreference({ mode: m.id })" />
        {{ m.label }}
      </label>
    </div>
  </fieldset>
</template>
