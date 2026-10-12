<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CatFace from './kitten/CatFace.vue'

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
    <aside class="no-print border-line bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r">
      <div class="flex items-center gap-3 px-5 pt-6 pb-4">
        <CatFace class="kitten-only shrink-0 text-4xl" />
        <div class="min-w-0">
          <p class="text-xs text-ink-soft">Praktijkboekhouding</p>
          <p class="truncate font-semibold">{{ practiceName || 'Mijn praktijk' }}</p>
        </div>
      </div>
      <nav class="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:flex-col md:overflow-visible">
        <RouterLink
          v-for="item in nav"
          :key="item.label"
          :to="item.to"
          class="nav-link whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink"
          exact-active-class="bg-sage-light !text-sage-dark font-medium"
        >{{ item.label }}</RouterLink>
        <button class="whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-mist md:hidden" @click="$emit('logout')">Uitloggen</button>
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
