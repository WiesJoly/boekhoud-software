<script setup lang="ts">
import SleepingCat from './kitten/SleepingCat.vue'
</script>

<template>
  <div class="rounded-lg border border-dashed border-line px-6 py-10 text-center text-ink-soft">
    <div class="kitten-only"><SleepingCat class="mx-auto mb-3 block" /></div>
    <slot />
  </div>
</template>
