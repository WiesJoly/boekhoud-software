<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createInvoice } from '../data/invoices'
import { addDays, invoiceTotals } from '../domain/invoices'
import type { Invoice, InvoiceLine } from '../domain/types'
import { effectiveVatCode, invoiceWarnings, type VatWarning } from '../domain/vat'
import { DEBTOR_TYPE_LABEL, VAT_LABEL } from '../labels'
import { today, usePracticeStore } from '../stores/practice'
import { useToastStore } from '../stores/toast'
import AmountText from './AmountText.vue'
import MoneyInput from './MoneyInput.vue'

const props = defineProps<{ prefill?: { debtorId?: string; lines?: InvoiceLine[]; consultIds?: string[] } }>()
const emit = defineEmits<{ saved: [invoice: Invoice]; cancel: [] }>()

const practice = usePracticeStore()
const toast = useToastStore()

const form = reactive({
  debtorId: props.prefill?.debtorId ?? '',
  date: today(),
  paymentDays: 14,
  lines: (props.prefill?.lines ?? []).map((l) => ({ ...l })) as InvoiceLine[],
})
const busy = ref(false)

const profile = computed(() => practice.settings?.vatProfile ?? 'exempt')
const debtor = computed(() => practice.debtorById.get(form.debtorId))

function addLine() {
  const service = practice.services[0]
  form.lines.push({
    serviceId: service?.id ?? '',
    description: service?.name ?? '',
    date: form.date,
    qty: 1,
    unitCents: service?.rateCents ?? 0,
    vatCode: effectiveVatCode(service?.vatCode ?? 'exempt', profile.value),
  })
}
if (!form.lines.length) addLine()

function selectService(line: InvoiceLine) {
  const service = practice.services.find((s) => s.id === line.serviceId)
  if (!service) return
  line.description = service.name
  line.unitCents = service.rateCents
  line.vatCode = effectiveVatCode(service.vatCode ?? 'exempt', profile.value)
}

const totals = computed(() => invoiceTotals(form.lines))
const warnings = computed<VatWarning[]>(() => (debtor.value ? invoiceWarnings(form.lines, debtor.value, practice.services) : []))

const WARNING_TEXT: Record<VatWarning, string> = {
  MISSING_VAT_CODE: 'Een dienst op deze factuur heeft geen btw-code. Stel die eerst in bij Instellingen.',
  EXEMPT_TO_ORGANISATION: 'Vrijgestelde factuur aan een organisatie: gaat het echt om therapeutische zorg? Arbeidspsychologie en coaching zijn belast.',
  ABOVE_MAX_RATE: 'Het tarief ligt boven het conventietarief van deze dienst.',
  PEPPOL_REQUIRED: 'Belaste factuur aan een onderneming: sinds 2026 moet die als e-factuur via Peppol verstuurd worden. Verstuur ze via je Peppol-dienst of boekhoudpakket; een pdf volstaat niet.',
}
const blocking = computed(() => warnings.value.includes('MISSING_VAT_CODE'))
const canSave = computed(() => !!debtor.value && form.lines.length > 0 && totals.value.totalCents > 0 && !blocking.value && !busy.value && !!practice.settings)

async function save() {
  if (!canSave.value) return
  busy.value = true
  try {
    const consultIds = props.prefill?.consultIds ?? []
    const draft = {
      kind: 'invoice' as const,
      date: form.date,
      dueDate: addDays(form.date, form.paymentDays),
      debtorId: form.debtorId,
      lines: form.lines,
      ...totals.value,
      paidCents: 0,
      status: 'open' as const,
      reminders: [],
      ...(consultIds.length ? { consultIds } : {}),
    }
    const invoice = await createInvoice(draft, (tx, invoiceId) => consultIds.forEach((id) => tx.update(`consults/${id}`, { invoiceId })))
    toast.success(`Factuur ${invoice.number} gemaakt`)
    emit('saved', invoice)
  } catch (e) {
    toast.error(`Factuur maken mislukt: ${e instanceof Error ? e.message : e}`)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="sm:col-span-3">
        <label class="label" for="inv-debtor">Aan</label>
        <select id="inv-debtor" v-model="form.debtorId" class="field" required>
          <option value="" disabled>Kies een debiteur</option>
          <option v-for="d in practice.debtors" :key="d.id" :value="d.id">{{ d.displayName }} · {{ DEBTOR_TYPE_LABEL[d.type] }}</option>
        </select>
        <p v-if="!practice.debtors.length" class="mt-1 text-sm text-ink-soft">Voeg eerst een debiteur toe bij Instellingen.</p>
      </div>
      <div>
        <label class="label" for="inv-date">Factuurdatum</label>
        <input id="inv-date" v-model="form.date" type="date" class="field" required />
      </div>
      <div>
        <label class="label" for="inv-days">Betalen binnen</label>
        <select id="inv-days" v-model.number="form.paymentDays" class="field">
          <option :value="14">14 dagen</option>
          <option :value="30">30 dagen</option>
          <option :value="0">Direct</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="table min-w-[40rem]">
        <thead><tr><th>Dienst</th><th>Omschrijving</th><th>Datum</th><th class="w-16">Aantal</th><th class="w-32">Prijs</th><th>Btw</th><th /></tr></thead>
        <tbody>
          <tr v-for="(line, i) in form.lines" :key="i">
            <td>
              <select v-model="line.serviceId" class="field" :aria-label="`Dienst regel ${i + 1}`" @change="selectService(line)">
                <option v-for="s in practice.services" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </td>
            <td><input v-model="line.description" class="field" :aria-label="`Omschrijving regel ${i + 1}`" /></td>
            <td><input v-model="line.date" type="date" class="field" :aria-label="`Datum regel ${i + 1}`" /></td>
            <td><input v-model.number="line.qty" type="number" min="1" step="1" class="field" :aria-label="`Aantal regel ${i + 1}`" /></td>
            <td><MoneyInput v-model="line.unitCents" /></td>
            <td class="whitespace-nowrap text-ink-soft">{{ VAT_LABEL[line.vatCode] }}</td>
            <td><button type="button" class="btn-quiet" :aria-label="`Regel ${i + 1} verwijderen`" @click="form.lines.splice(i, 1)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <button type="button" class="btn-secondary" :disabled="!practice.services.length" @click="addLine">Regel toevoegen</button>

    <dl class="ml-auto grid w-64 grid-cols-2 gap-y-1 text-sm">
      <dt class="text-ink-soft">Subtotaal</dt><dd class="text-right"><AmountText :cents="totals.netCents" /></dd>
      <dt class="text-ink-soft">Btw</dt><dd class="text-right"><AmountText :cents="totals.vatCents" /></dd>
      <dt class="font-medium">Totaal</dt><dd class="text-right font-medium"><AmountText :cents="totals.totalCents" /></dd>
    </dl>

    <ul v-if="warnings.length" class="space-y-2">
      <li
        v-for="w in warnings"
        :key="w"
        class="rounded-md px-3 py-2 text-sm"
        :class="w === 'MISSING_VAT_CODE' ? 'bg-brick-light text-brick' : 'bg-ochre-light text-ink'"
      >{{ WARNING_TEXT[w] }}</li>
    </ul>

    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="emit('cancel')">Annuleren</button>
      <button class="btn-primary" :disabled="!canSave">Factuur maken</button>
    </div>
  </form>
</template>
