<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AmountText from '../components/AmountText.vue'
import PawIcon from '../components/kitten/PawIcon.vue'
import { profitAndLoss, revenueSplit } from '../domain/annualReport'
import { outstandingCents } from '../domain/invoices'
import { buildTasks } from '../domain/tasks'
import { reservationToDate } from '../domain/taxEstimate'
import type { DebtorType } from '../domain/types'
import { DEBTOR_TYPE_LABEL } from '../labels'
import { today, usePracticeStore } from '../stores/practice'

const practice = usePracticeStore()
const now = today()
const year = Number(now.slice(0, 4))
const monthStart = `${now.slice(0, 7)}-01`

const input = computed(() => practice.reportInput(year))
const profit = computed(() => (input.value ? profitAndLoss(input.value).profitCents : 0))
const reservation = computed(() => Math.max(0, reservationToDate(profit.value, now, practice.fiscal)))
const balance = computed(() => practice.bankBalance)
const available = computed(() => balance.value - reservation.value)
const reservedShare = computed(() => (balance.value > 0 ? Math.min(100, Math.round((reservation.value / balance.value) * 100)) : 100))

const month = computed(() => (input.value ? revenueSplit(input.value, monthStart, now) : { careCents: 0, otherCents: 0 }))
const ytd = computed(() => (input.value ? revenueSplit(input.value, `${year}-01-01`, now) : { careCents: 0, otherCents: 0 }))

const outstanding = computed(() => {
  const totals = new Map<DebtorType, { cents: number; count: number }>()
  const add = (type: DebtorType, cents: number) => {
    if (cents <= 0) return
    const t = totals.get(type) ?? { cents: 0, count: 0 }
    totals.set(type, { cents: t.cents + cents, count: t.count + 1 })
  }
  const credits = practice.invoices.filter((i) => i.kind === 'credit')
  for (const i of practice.invoices.filter((x) => x.kind === 'invoice' && x.status === 'open')) {
    add(practice.debtorById.get(i.debtorId)?.type ?? 'organisation', outstandingCents(i, credits))
  }
  for (const c of practice.consults.filter((x) => x.status === 'declared' && !x.invoiceId)) {
    add(practice.debtorById.get(c.debtorId)?.type ?? 'mutuality', c.amountCents)
  }
  return (['mutuality', 'network', 'client', 'organisation'] as DebtorType[]).map((type) => ({ type, ...(totals.get(type) ?? { cents: 0, count: 0 }) }))
})

const unbilled = computed(() => practice.consults.filter((c) => c.status === 'registered' && !c.invoiceId))
const tasks = computed(() =>
  buildTasks({ consults: practice.consults, invoices: practice.invoices, debtors: practice.debtors, transactions: practice.transactions, today: now }),
)
</script>

<template>
  <section class="mb-10">
    <p class="flex items-center gap-2 text-ink-soft"><PawIcon class="kitten-only text-sage" /> Beschikbaar om uit te geven</p>
    <p class="amount mt-1 text-5xl leading-tight md:text-6xl" :class="available < 0 ? 'text-brick' : 'text-ink'">
      <AmountText :cents="available" />
    </p>
    <div class="mt-5 max-w-xl">
      <div class="flex h-2.5 overflow-hidden rounded-full bg-mist" role="img" :aria-label="`${reservedShare}% van je saldo is voor belastingen en sociale bijdragen`">
        <div class="bg-sage" :style="{ width: `${100 - reservedShare}%` }" />
        <div class="bg-ochre" :style="{ width: `${reservedShare}%` }" />
      </div>
      <dl class="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm">
        <div class="flex gap-2"><dt class="text-ink-soft">Op de rekening</dt><dd><AmountText :cents="balance" /></dd></div>
        <div class="flex gap-2">
          <dt class="text-ink-soft">Opzij voor belasting en sociale bijdragen</dt>
          <dd><RouterLink :to="{ name: 'tax' }" class="underline decoration-line underline-offset-2"><AmountText :cents="reservation" /></RouterLink></dd>
        </div>
      </dl>
    </div>
  </section>

  <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
    <div class="space-y-10">
      <section>
        <h2 class="mb-3">Omzet</h2>
        <table class="table max-w-xl">
          <thead><tr><th /><th class="text-right">Deze maand</th><th class="text-right">Dit jaar</th></tr></thead>
          <tbody>
            <tr><td>Zorg</td><td class="text-right"><AmountText :cents="month.careCents" /></td><td class="text-right"><AmountText :cents="ytd.careCents" /></td></tr>
            <tr><td>Andere diensten</td><td class="text-right"><AmountText :cents="month.otherCents" /></td><td class="text-right"><AmountText :cents="ytd.otherCents" /></td></tr>
            <tr>
              <td class="font-medium">Totaal</td>
              <td class="text-right font-medium"><AmountText :cents="month.careCents + month.otherCents" /></td>
              <td class="text-right font-medium"><AmountText :cents="ytd.careCents + ytd.otherCents" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="mb-3">Nog te ontvangen</h2>
        <table class="table max-w-xl">
          <tbody>
            <tr v-for="o in outstanding" :key="o.type">
              <td>{{ DEBTOR_TYPE_LABEL[o.type] }}</td>
              <td class="text-ink-soft">{{ o.count ? `${o.count} ${o.count === 1 ? 'post' : 'posten'}` : '' }}</td>
              <td class="text-right"><AmountText :cents="o.cents" :muted="o.cents === 0" /></td>
            </tr>
            <tr>
              <td>Sessies nog te factureren</td>
              <td class="text-ink-soft">{{ unbilled.length || '' }}</td>
              <td class="text-right"><AmountText :cents="unbilled.reduce((s, c) => s + c.amountCents, 0)" :muted="!unbilled.length" /></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <section>
      <h2 class="mb-3">Deze week</h2>
      <ul v-if="tasks.length" class="divide-y divide-mist rounded-lg border border-line bg-surface">
        <li v-for="t in tasks" :key="t.id">
          <RouterLink :to="{ name: t.route }" class="flex items-center justify-between px-4 py-3 hover:bg-mist">
            <span>{{ t.label }}</span>
            <span aria-hidden="true" class="text-ink-soft">›</span>
          </RouterLink>
        </li>
      </ul>
      <p v-else class="rounded-lg border border-line bg-surface px-4 py-6 text-ink-soft">
        Niets te doen. Importeer je nieuwste uittreksel bij Bank om bij te blijven.
      </p>
    </section>
  </div>
</template>
