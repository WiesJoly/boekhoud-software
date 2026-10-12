<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()

onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    :class="wide ? 'max-w-4xl' : 'max-w-lg'"
    @close="emit('close')"
    @cancel.prevent="emit('close')"
  >
    <div class="flex items-center justify-between border-b border-line px-5 py-4">
      <h2>{{ title }}</h2>
      <button class="text-ink-soft hover:text-ink" aria-label="Sluiten" @click="emit('close')">✕</button>
    </div>
    <div class="max-h-[75vh] overflow-y-auto px-5 py-4">
      <slot />
    </div>
  </dialog>
</template>
