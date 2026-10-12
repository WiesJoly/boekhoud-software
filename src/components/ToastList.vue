<script setup lang="ts">
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="no-print fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
    <div
      v-for="t in toast.toasts"
      :key="t.id"
      class="flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-sm"
      :class="t.kind === 'error' ? 'border-brick/30 bg-brick-light text-brick' : 'border-sage/30 bg-sage-light text-sage-dark'"
      :role="t.kind === 'error' ? 'alert' : 'status'"
    >
      <p class="flex-1">{{ t.message }}</p>
      <button class="opacity-70 hover:opacity-100" aria-label="Sluiten" @click="toast.dismiss(t.id)">✕</button>
    </div>
  </div>
</template>
