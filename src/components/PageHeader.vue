<script setup lang="ts">
defineProps<{ title: string; intro?: string }>()
</script>

<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="intro" class="mt-1 max-w-2xl text-ink-soft">{{ intro }}</p>
    </div>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </header>
</template>
