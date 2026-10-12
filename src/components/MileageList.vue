<script setup lang="ts">
import { computed, reactive } from 'vue'
import { mileageRepo } from '../data/repos'
import { formatDate } from '../domain/invoices'
import { today, usePracticeStore } from '../stores/practice'
import { attempt } from '../stores/toast'
import AmountText from './AmountText.vue'
import EmptyState from './EmptyState.vue'

const practice = usePracticeStore()
const form = reactive({ date: today(), from: '', to: '', km: 0, purpose: '' })

const places = computed(() => [...new Set(practice.mileage.flatMap((m) => [m.from, m.to]))].sort())
const year = today().slice(0, 4)
const kmThisYear = computed(() => practice.mileage.filter((m) => m.date.startsWith(year)).reduce((s, m) => s + m.km, 0))

async function add() {
  if (form.km <= 0) return
  const ok = await attempt(() => mileageRepo.add({ ...form }), 'Rit opslaan mislukt', 'Rit opgeslagen')
  if (ok) Object.assign(form, { from: form.to, to: '', km: 0, purpose: '' })
}
</script>

<template>
  <p class="mb-4 max-w-2xl text-sm text-ink-soft">
    Als zelfstandige trek je de werkelijke kosten van je wagen af, volgens de aftrekbaarheid van je wagen. Dit rittenlogboek bewijst het beroepsmatige gebruik.
  </p>
  <form class="panel mb-6 grid gap-3 sm:grid-cols-[8rem_1fr_1fr_6rem_1fr_auto] sm:items-end" @submit.prevent="add">
    <div><label class="label" for="km-date">Datum</label><input id="km-date" v-model="form.date" type="date" class="field" required /></div>
    <div><label class="label" for="km-from">Van</label><input id="km-from" v-model="form.from" class="field" list="km-places" required /></div>
    <div><label class="label" for="km-to">Naar</label><input id="km-to" v-model="form.to" class="field" list="km-places" required /></div>
    <div><label class="label" for="km-km">Km</label><input id="km-km" v-model.number="form.km" type="number" min="1" class="field" required /></div>
    <div><label class="label" for="km-purpose">Doel</label><input id="km-purpose" v-model="form.purpose" class="field" placeholder="bijv. intervisie" /></div>
    <button class="btn-primary">Rit toevoegen</button>
    <datalist id="km-places"><option v-for="p in places" :key="p" :value="p" /></datalist>
  </form>

  <p class="mb-3 text-sm">
    {{ kmThisYear }} km beroepsmatig in {{ year }}<template v-if="practice.fiscal.mileageRateCents > 0">,
      vergoeding <AmountText :cents="kmThisYear * practice.fiscal.mileageRateCents" /></template>.
  </p>
  <EmptyState v-if="!practice.mileage.length">Nog geen ritten.</EmptyState>
  <table v-else class="table">
    <thead><tr><th>Datum</th><th>Van</th><th>Naar</th><th>Doel</th><th class="text-right">Km</th></tr></thead>
    <tbody>
      <tr v-for="m in practice.mileage" :key="m.id">
        <td class="whitespace-nowrap text-ink-soft">{{ formatDate(m.date) }}</td>
        <td>{{ m.from }}</td><td>{{ m.to }}</td><td class="text-ink-soft">{{ m.purpose }}</td>
        <td class="text-right">{{ m.km }}</td>
      </tr>
    </tbody>
  </table>
</template>
