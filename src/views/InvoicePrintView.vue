<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AmountText from '../components/AmountText.vue'
import { formatDate } from '../domain/invoices'
import type { VatCode } from '../domain/types'
import { VAT_INVOICE_TEXT } from '../labels'
import { usePracticeStore } from '../stores/practice'

const route = useRoute()
const practice = usePracticeStore()

const invoice = computed(() => practice.invoices.find((i) => i.id === route.params.id))
const original = computed(() => practice.invoices.find((i) => i.id === invoice.value?.creditOf))
const debtor = computed(() => (invoice.value ? practice.debtorById.get(invoice.value.debtorId) : undefined))
const s = computed(() => practice.settings)
const serviceCode = (id: string) => practice.services.find((x) => x.id === id)?.code ?? ''
const vatTexts = computed(() => {
  const codes = new Set<VatCode>(invoice.value?.lines.map((l) => l.vatCode) ?? [])
  return [...codes].map((c) => VAT_INVOICE_TEXT[c]).filter(Boolean)
})
const print = () => window.print()
</script>

<template>
  <div class="force-light min-h-screen bg-mist py-8 print:bg-white print:py-0">
    <div class="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
      <button class="btn-primary" @click="print">Afdrukken of opslaan als pdf</button>
    </div>

    <p v-if="!invoice" class="mx-auto max-w-[210mm] px-4 text-ink-soft">Factuur laden…</p>
    <article v-else class="mx-auto max-w-[210mm] bg-white p-[18mm] text-[13px] leading-relaxed shadow-sm print:p-0 print:shadow-none">
      <header class="mb-10 flex justify-between gap-8">
        <div>
          <p class="text-lg font-semibold">{{ s?.name }}</p>
          <p class="whitespace-pre-line text-ink-soft">{{ s?.address }}</p>
        </div>
        <dl class="grid grid-cols-[auto_auto] gap-x-4 text-right text-ink-soft">
          <template v-if="s?.enterpriseNumber"><dt>Ondernemingsnr.</dt><dd>{{ s.enterpriseNumber }}</dd></template>
          <template v-if="s?.vatNumber"><dt>Btw</dt><dd>{{ s.vatNumber }}</dd></template>
          <template v-if="s?.rizivNumber"><dt>RIZIV</dt><dd>{{ s.rizivNumber }}</dd></template>
          <template v-if="s?.visumNumber"><dt>Visum</dt><dd>{{ s.visumNumber }}</dd></template>
          <template v-if="s?.iban"><dt>IBAN</dt><dd>{{ s.iban }}</dd></template>
        </dl>
      </header>

      <section class="mb-10 flex justify-between gap-8">
        <div>
          <p class="text-ink-soft">Aan</p>
          <p class="font-medium">{{ debtor?.invoiceName || debtor?.displayName }}</p>
          <p class="whitespace-pre-line">{{ debtor?.address }}</p>
          <p v-if="debtor?.vatNumber">Btw {{ debtor.vatNumber }}</p>
        </div>
        <div class="text-right">
          <h1 class="amount text-3xl font-normal">{{ invoice.kind === 'credit' ? 'Creditnota' : 'Factuur' }}</h1>
          <p>Nummer {{ invoice.number }}</p>
          <p>Datum {{ formatDate(invoice.date) }}</p>
          <p v-if="invoice.kind === 'invoice'">Te betalen voor {{ formatDate(invoice.dueDate) }}</p>
          <p v-if="original">Bij factuur {{ original.number }} van {{ formatDate(original.date) }}</p>
        </div>
      </section>

      <table class="table mb-6">
        <thead><tr><th>Datum</th><th>Omschrijving</th><th>Code</th><th class="text-right">Aantal</th><th class="text-right">Prijs</th><th class="text-right">Bedrag</th></tr></thead>
        <tbody>
          <tr v-for="(line, i) in invoice.lines" :key="i">
            <td>{{ formatDate(line.date) }}</td>
            <td>{{ line.description }}</td>
            <td class="text-ink-soft">{{ serviceCode(line.serviceId) }}</td>
            <td class="text-right">{{ line.qty }}</td>
            <td class="text-right"><AmountText :cents="line.unitCents" /></td>
            <td class="text-right"><AmountText :cents="Math.round(line.qty * line.unitCents)" /></td>
          </tr>
        </tbody>
      </table>

      <dl class="mb-8 ml-auto grid w-72 grid-cols-2 gap-y-1">
        <dt>Subtotaal</dt><dd class="text-right"><AmountText :cents="invoice.netCents" /></dd>
        <template v-if="invoice.vatCents !== 0"><dt>Btw 21%</dt><dd class="text-right"><AmountText :cents="invoice.vatCents" /></dd></template>
        <dt class="border-t border-line pt-1 font-semibold">Totaal</dt>
        <dd class="border-t border-line pt-1 text-right font-semibold"><AmountText :cents="invoice.totalCents" /></dd>
      </dl>

      <p v-for="t in vatTexts" :key="t" class="text-ink-soft">{{ t }}</p>

      <section v-if="invoice.kind === 'invoice'" class="mt-8 rounded-md border border-line p-4">
        <p>Gelieve <AmountText :cents="invoice.totalCents" /> over te schrijven op {{ s?.iban }} met de gestructureerde mededeling</p>
        <p class="amount mt-1 text-lg">{{ invoice.paymentReference }}</p>
      </section>
    </article>
  </div>
</template>
