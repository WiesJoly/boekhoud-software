<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{ practiceName?: string }>()
defineEmits<{ logout: [] }>()

const nav = [
  { to: { name: 'overview' }, label: 'Overzicht' },
  { to: { name: 'consults' }, label: 'Sessies' },
  { to: { name: 'invoices' }, label: 'Facturen' },
  { to: { name: 'expenses' }, label: 'Uitgaven' },
  { to: { name: 'bank' }, label: 'Bank' },
  { to: { name: 'tax' }, label: 'Belasting' },
  { to: { name: 'settings' }, label: 'Instellingen' },
]
</script>

<template>
  <div class="min-h-screen md:flex">
    <aside class="no-print border-line bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r">
      <div class="px-5 pt-6 pb-4">
        <p class="text-xs text-ink-soft">Praktijkboekhouding</p>
        <p class="truncate font-semibold">{{ practiceName || 'Mijn praktijk' }}</p>
      </div>
      <nav class="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        <RouterLink
          v-for="item in nav"
          :key="item.label"
          :to="item.to"
          class="whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink"
          exact-active-class="bg-sage-light !text-sage-dark font-medium"
        >{{ item.label }}</RouterLink>
      </nav>
      <div class="hidden px-3 md:absolute md:bottom-4 md:block">
        <button class="btn-quiet" @click="$emit('logout')">Uitloggen</button>
      </div>
    </aside>
    <main class="w-full max-w-6xl px-4 py-8 md:px-10">
      <slot />
    </main>
  </div>
</template>
