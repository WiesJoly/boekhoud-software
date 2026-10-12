<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import { computed, ref } from 'vue'
import AmountText from '../components/AmountText.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import ImportPreview from '../components/ImportPreview.vue'
import InvoiceEditor from '../components/InvoiceEditor.vue'
import PageHeader from '../components/PageHeader.vue'
import { consultsRepo, debtorsRepo } from '../data/repos'
import type { ImportResult } from '../domain/bankImport'
import { mergeConsult, parseDeclarationFile, rejectionAction, type ParsedConsult, type RejectionReason } from '../domain/declarationImport'
import { formatDate } from '../domain/invoices'
import { formatCents } from '../domain/money'
import type { Consult, ConsultStatus, InvoiceLine } from '../domain/types'
import { CONSULT_STATUS_LABEL } from '../labels'
import { usePracticeStore } from '../stores/practice'
import { attempt, useToastStore } from '../stores/toast'

const practice = usePracticeStore()
const toast = useToastStore()

const filter = ref<ConsultStatus | 'all'>('rejected')
const preview = ref<ImportResult<ParsedConsult> | null>(null)
const importing = ref(false)
const invoicing = ref<{ debtorId?: string; lines: InvoiceLine[]; consultIds: string[] } | null>(null)

const counts = computed(() => {
  const c: Record<ConsultStatus | 'all', number> = { registered: 0, declared: 0, rejected: 0, paid: 0, all: practice.consults.length }
  for (const x of practice.consults) c[x.status]++
  return c
})
const rows = computed(() => practice.consults.filter((c) => filter.value === 'all' || c.status === filter.value))

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  preview.value = parseDeclarationFile(await file.text())
}

const safeId = (externalId: string) => externalId.replace(/[/\s]+/g, '_')

async function confirmImport() {
  if (!preview.value) return
  importing.value = true
  const rowsToImport = preview.value.rows
  const ok = await attempt(async () => {
    // Create missing ziekenfondsen first so every session links to a debtor.
    const debtorIds = new Map(practice.debtors.map((d) => [d.displayName.toLowerCase(), d.id]))
    for (const name of new Set(rowsToImport.map((r) => r.debtorName))) {
      if (!debtorIds.has(name.toLowerCase())) {
        const id = await debtorsRepo.add({ type: 'mutuality', displayName: name, invoiceName: name, address: '', email: '', remindersEnabled: false })
        debtorIds.set(name.toLowerCase(), id)
      }
    }
    const existing = new Map(practice.consults.map((c) => [c.id, c]))
    const items = rowsToImport.map((r) => {
      const id = safeId(r.externalId)
      return { id, data: mergeConsult(existing.get(id), r, debtorIds.get(r.debtorName.toLowerCase())!) }
    })
    await consultsRepo.upsertMany(items)
    const added = items.filter((i) => !existing.has(i.id)).length
    toast.success(`${added} nieuwe en ${items.length - added} bijgewerkte sessies geïmporteerd`)
  }, 'Importeren mislukt')
  importing.value = false
  if (ok) {
    preview.value = null
    filter.value = 'all'
  }
}

function markResubmitted(c: Consult) {
  attempt(() => consultsRepo.update(c.id, { status: 'declared', resolution: 'Opnieuw ingediend' }), 'Bijwerken mislukt', 'Sessie staat weer op ingediend')
}

function invoiceToClient(c: Consult) {
  const service = practice.services.find((s) => s.code && s.code === c.serviceCode) ?? practice.services.find((s) => s.revenueAccount === 'omzet-zelfbetalers')
  invoicing.value = {
    lines: [{
      serviceId: service?.id ?? '',
      description: service?.name ?? 'Sessie',
      date: c.date,
      qty: 1,
      unitCents: service?.rateCents || c.amountCents,
      vatCode: service?.vatCode ?? 'exempt',
    }],
    consultIds: [c.id],
  }
}

const TABS: { id: ConsultStatus | 'all'; label: string }[] = [
  { id: 'rejected', label: 'Geweigerd' },
  { id: 'registered', label: 'Nog te factureren' },
  { id: 'declared', label: 'Ingediend' },
  { id: 'paid', label: 'Betaald' },
  { id: 'all', label: 'Alles' },
]
const previewColumns: { key: keyof ParsedConsult & string; label: string; format?: (v: unknown) => string }[] = [
  { key: 'date', label: 'Datum', format: (v) => formatDate(String(v)) },
  { key: 'debtorName', label: 'Ziekenfonds' },
  { key: 'amountCents', label: 'Bedrag', format: (v) => formatCents(Number(v)) },
  { key: 'status', label: 'Status', format: (v) => CONSULT_STATUS_LABEL[v as ConsultStatus] },
]
const debtorName = (id: string) => practice.debtorById.get(id)?.displayName ?? '—'
</script>

<template>
  <PageHeader
    title="Sessies"
    intro="Sessies uit je EPD of het platform eerstelijnspsychologische zorg, met hun terugbetalingsstatus. Importeer het CSV-bestand; dezelfde sessie opnieuw importeren werkt haar bij."
  >
    <label class="btn-primary cursor-pointer">
      <AppIcon name="upload" />CSV importeren
      <input type="file" accept=".csv,text/csv" class="sr-only" @change="onFile" />
    </label>
  </PageHeader>

  <div class="mb-4 flex flex-wrap gap-1" role="tablist">
    <button
      v-for="t in TABS"
      :key="t.id"
      role="tab"
      :aria-selected="filter === t.id"
      class="rounded-md px-3 py-1.5 text-sm"
      :class="filter === t.id ? 'bg-sage-light font-medium text-sage-dark' : 'text-ink-soft hover:bg-mist'"
      @click="filter = t.id"
    >{{ t.label }} <span class="text-ink-soft">{{ counts[t.id] }}</span></button>
  </div>

  <EmptyState v-if="!practice.consults.length">
    Nog geen sessies. Exporteer je sessies als CSV met de kolommen
    <code class="text-ink">sessie_id;datum;ziekenfonds;pseudocode;bedrag;status;reden;betaald</code> en importeer ze hier.
  </EmptyState>
  <EmptyState v-else-if="!rows.length">Geen sessies in deze lijst.</EmptyState>
  <div v-else class="overflow-x-auto">
    <table class="table min-w-[44rem]">
      <thead><tr><th>Datum</th><th>Ziekenfonds / debiteur</th><th class="text-right">Bedrag</th><th class="text-right">Ontvangen</th><th>Status</th><th /></tr></thead>
      <tbody>
        <tr v-for="c in rows" :key="c.id">
          <td class="whitespace-nowrap text-ink-soft">{{ formatDate(c.date) }}</td>
          <td>{{ debtorName(c.debtorId) }}</td>
          <td class="text-right"><AmountText :cents="c.amountCents" /></td>
          <td class="text-right"><AmountText :cents="c.paidCents" muted /></td>
          <td>
            <span class="badge" :class="c.status === 'rejected' && !c.resolution ? 'bg-brick-light text-brick' : 'bg-mist text-ink-soft'">{{ CONSULT_STATUS_LABEL[c.status] }}</span>
            <p v-if="c.status === 'rejected' && c.rejectionReason" class="mt-1 max-w-md text-sm text-ink-soft">
              {{ rejectionAction(c.rejectionReason as RejectionReason) }}
            </p>
            <p v-if="c.resolution" class="mt-1 text-sm text-ink-soft">{{ c.resolution }}</p>
            <p v-if="c.invoiceId" class="mt-1 text-sm text-ink-soft">Gefactureerd aan cliënt</p>
          </td>
          <td class="whitespace-nowrap text-right">
            <template v-if="c.status === 'rejected' && !c.invoiceId">
              <button class="btn-quiet" @click="markResubmitted(c)">Opnieuw ingediend</button>
              <button class="btn-quiet" @click="invoiceToClient(c)">Factureren aan cliënt</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <AppModal v-if="preview" title="Sessies importeren" wide @close="preview = null">
    <ImportPreview
      :rows="preview.rows"
      :errors="preview.errors"
      :busy="importing"
      :columns="previewColumns"
      @confirm="confirmImport"
      @cancel="preview = null"
    />
  </AppModal>

  <AppModal v-if="invoicing" title="Sessie factureren aan cliënt" wide @close="invoicing = null">
    <InvoiceEditor :prefill="invoicing" @saved="invoicing = null" @cancel="invoicing = null" />
  </AppModal>
</template>
