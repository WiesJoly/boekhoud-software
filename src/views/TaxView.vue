<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AmountText from '../components/AmountText.vue'
import PageHeader from '../components/PageHeader.vue'
import { accountName } from '../domain/accounts'
import { balanceSheet, exportRows, profitAndLoss } from '../domain/annualReport'
import { toCsv } from '../domain/csv'
import { dayOfYear, estimateTax, reservationToDate } from '../domain/taxEstimate'
import { smallBusinessSignal, taxedTurnover, vatReturn, type Quarter } from '../domain/vatReturn'
import { today, usePracticeStore } from '../stores/practice'
import { useToastStore } from '../stores/toast'

const practice = usePracticeStore()
const toast = useToastStore()

const currentYear = Number(today().slice(0, 4))
const year = ref(currentYear)
const years = computed(() => {
  const seen = new Set([currentYear, ...practice.invoices.map((i) => Number(i.date.slice(0, 4))), ...practice.expenses.map((e) => Number(e.date.slice(0, 4)))])
  return [...seen].sort((a, b) => b - a)
})
watch(year, (y) => practice.loadYear(y).catch((e) => toast.error(`Fiscale parameters laden mislukt: ${e.message}`)))

const input = computed(() => practice.reportInput(year.value))
const pl = computed(() => (input.value ? profitAndLoss(input.value) : null))
const bs = computed(() => (input.value ? balanceSheet(input.value) : null))
const profile = computed(() => practice.settings?.vatProfile ?? 'exempt')
const files = computed(() => profile.value === 'mixed' || profile.value === 'taxed')

const quarters = computed(() => ([1, 2, 3, 4] as Quarter[]).map((q) => ({ q, r: vatReturn(year.value, q, practice.invoices, practice.expenses) })))
const smallBusiness = computed(() => smallBusinessSignal(taxedTurnover(year.value, practice.invoices), practice.fiscal))

const isCurrentYear = computed(() => year.value === currentYear)
const estimate = computed(() => {
  if (!pl.value) return null
  if (!isCurrentYear.value) return estimateTax({ profitCents: pl.value.profitCents, params: practice.fiscal })
  const projectedProfit = Math.round(pl.value.profitCents * (365 / dayOfYear(today())))
  return estimateTax({ profitCents: projectedProfit, params: practice.fiscal })
})
const reservation = computed(() => (pl.value && isCurrentYear.value ? reservationToDate(pl.value.profitCents, today(), practice.fiscal) : estimate.value?.totalCents ?? 0))

function exportCsv() {
  if (!input.value) return
  const blob = new Blob(['﻿' + toCsv(exportRows(input.value))], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `boekhouding-${year.value}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
const print = () => window.print()
const sum = (lines: { cents: number }[]) => lines.reduce((s, l) => s + l.cents, 0)
</script>

<template>
  <PageHeader title="Belasting" intro="Btw, wat je opzijzet voor personenbelasting en sociale bijdragen, en je jaarcijfers voor de boekhouder.">
    <select v-model.number="year" class="field w-auto" aria-label="Jaar">
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>
  </PageHeader>

  <p v-if="practice.fiscalUsingDefaults || !practice.fiscal.verified" class="no-print mb-6 rounded-md bg-ochre-light px-4 py-3 text-sm">
    De fiscale bedragen voor {{ year }} zijn indicatief (belastingschalen, belastingvrije som, sociale bijdragen). Laat ze nakijken door je boekhouder voor je erop rekent.
  </p>

  <section class="mb-10">
    <h2 class="mb-3">Btw</h2>
    <template v-if="files">
      <p class="mb-3 text-sm text-ink-soft">Kwartaalaangifte. Rooster 00: vrijgestelde handelingen (art. 44), 03: maatstaf 21%, 54: verschuldigde btw, 59: aftrekbare btw.</p>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="{ q, r } in quarters" :key="q" class="panel">
          <h3 class="mb-2 font-medium">Kwartaal {{ q }}</h3>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt class="text-ink-soft">00</dt><dd class="text-right"><AmountText :cents="r.grid00Cents" /></dd>
            <dt class="text-ink-soft">03</dt><dd class="text-right"><AmountText :cents="r.grid03Cents" /></dd>
            <dt class="text-ink-soft">54</dt><dd class="text-right"><AmountText :cents="r.grid54Cents" /></dd>
            <dt class="text-ink-soft">59</dt><dd class="text-right"><AmountText :cents="r.grid59Cents" /></dd>
            <template v-if="r.grid72Cents"><dt class="font-medium">72 terug</dt><dd class="text-right font-medium"><AmountText :cents="r.grid72Cents" /></dd></template>
            <template v-else><dt class="font-medium">71 te betalen</dt><dd class="text-right font-medium"><AmountText :cents="r.grid71Cents" /></dd></template>
          </dl>
        </div>
      </div>
    </template>
    <p v-else-if="profile === 'exempt'" class="max-w-2xl text-sm">
      Je levert alleen zorg die vrijgesteld is door artikel 44: je dient geen periodieke btw-aangifte in. Ga je ook coaching, opleidingen of verslagen factureren, kies dan bij Instellingen het profiel "Zorg en belaste diensten".
    </p>
    <p v-else class="max-w-2xl text-sm">
      Je valt onder de vrijstellingsregeling voor kleine ondernemingen: je rekent geen btw aan en dient geen periodieke aangifte in. Vanaf 2026 dien je wel elk jaar een klantenlisting in, ook als die leeg is.
    </p>
    <p v-if="profile !== 'exempt' || taxedTurnover(year, practice.invoices) > 0" class="mt-4 max-w-2xl rounded-md border border-line bg-white px-4 py-3 text-sm">
      {{ smallBusiness.explanation }}
    </p>
  </section>

  <section v-if="pl && estimate" class="mb-10">
    <h2 class="mb-3">Opzijzetten voor belastingen</h2>
    <div class="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
      <div class="panel">
        <p class="text-sm text-ink-soft">{{ isCurrentYear ? 'Zet nu opzij' : `Geraamd voor ${year}` }}</p>
        <p class="amount mt-1 text-4xl"><AmountText :cents="reservation" /></p>
        <p class="mt-2 text-sm text-ink-soft">
          Winst {{ isCurrentYear ? 'tot vandaag' : '' }}: <AmountText :cents="pl.profitCents" />.
          Doe voorafbetalingen om een vermeerdering te vermijden.
        </p>
      </div>
      <div>
        <p class="mb-2 text-sm text-ink-soft">{{ isCurrentYear ? 'Raming voor het hele jaar, als het zo verder loopt' : 'Raming' }}</p>
        <dl class="grid max-w-md grid-cols-[1fr_auto] gap-y-1 text-sm">
          <dt>Sociale bijdragen (incl. beheerskosten)</dt><dd class="text-right"><AmountText :cents="estimate.socialContributionsCents" /></dd>
          <dt>Belastbaar beroepsinkomen</dt><dd class="text-right"><AmountText :cents="estimate.taxableIncomeCents" muted /></dd>
          <dt>Personenbelasting</dt><dd class="text-right"><AmountText :cents="estimate.incomeTaxCents" /></dd>
          <dt>Aanvullende gemeentebelasting ({{ Math.round(practice.fiscal.municipalTaxRate * 100) }}%)</dt><dd class="text-right"><AmountText :cents="estimate.municipalTaxCents" /></dd>
          <dt class="border-t border-line pt-1 font-medium">Totaal</dt><dd class="border-t border-line pt-1 text-right font-medium"><AmountText :cents="estimate.totalCents" /></dd>
        </dl>
        <p class="mt-3 max-w-xl text-sm text-ink-soft">
          Vereenvoudigd: zelfstandige in hoofdberoep, alleenstaand zonder personen ten laste, geen andere inkomsten of aftrekken (zoals VAPZ of kinderen ten laste).
        </p>
      </div>
    </div>
  </section>

  <section v-if="pl && bs">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2>Jaarcijfers {{ year }}</h2>
      <div class="no-print flex gap-2">
        <button class="btn-secondary" @click="exportCsv">Exporteren voor boekhouder (CSV)</button>
        <button class="btn-secondary" @click="print">Afdrukken</button>
      </div>
    </div>
    <p class="mb-4 max-w-2xl text-sm text-ink-soft">De export bevat cliëntnummers en bedragen, geen namen of pseudocodes.</p>
    <div class="grid items-start gap-8 lg:grid-cols-2">
      <table class="table">
        <thead><tr><th>Resultaat</th><th class="text-right">Bedrag</th></tr></thead>
        <tbody>
          <tr v-for="l in pl.revenue" :key="l.account"><td>{{ accountName(l.account) }}</td><td class="text-right"><AmountText :cents="l.cents" /></td></tr>
          <tr><td class="font-medium">Ontvangsten</td><td class="text-right font-medium"><AmountText :cents="sum(pl.revenue)" /></td></tr>
          <tr v-for="l in pl.costs" :key="l.account"><td>{{ accountName(l.account) }}</td><td class="text-right"><AmountText :cents="-l.cents" /></td></tr>
          <tr><td class="font-medium">Beroepskosten</td><td class="text-right font-medium"><AmountText :cents="-sum(pl.costs)" /></td></tr>
          <tr><td class="font-semibold">Winst</td><td class="text-right font-semibold"><AmountText :cents="pl.profitCents" /></td></tr>
        </tbody>
      </table>
      <table class="table">
        <thead><tr><th>Balans op 31 december</th><th class="text-right">Bedrag</th></tr></thead>
        <tbody>
          <tr v-for="l in bs.assets" :key="l.account"><td>{{ accountName(l.account) }}</td><td class="text-right"><AmountText :cents="l.cents" /></td></tr>
          <tr v-for="l in bs.liabilities" :key="l.account"><td>{{ accountName(l.account) }}</td><td class="text-right"><AmountText :cents="-l.cents" /></td></tr>
          <tr><td class="font-semibold">Eigen vermogen</td><td class="text-right font-semibold"><AmountText :cents="bs.equityCents" /></td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
