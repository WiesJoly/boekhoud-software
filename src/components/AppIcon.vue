<script setup lang="ts">
import { ICONS, type IconName } from '../icons'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    width="1.15em"
    height="1.15em"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path v-for="(d, i) in ICONS[name]" :key="i" :d="d" />
  </svg>
</template>
