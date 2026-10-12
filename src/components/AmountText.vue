<script setup lang="ts">
import { formatCents } from '../domain/money'

defineProps<{ cents: number; muted?: boolean }>()
</script>

<template>
  <span class="amount whitespace-nowrap" :class="{ 'text-brick': cents < 0 && !muted, 'text-ink-soft': muted }">{{ formatCents(cents) }}</span>
</template>
