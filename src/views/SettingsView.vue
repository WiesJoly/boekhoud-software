<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AmountText from '../components/AmountText.vue'
import AppModal from '../components/AppModal.vue'
import DebtorForm from '../components/DebtorForm.vue'
import EmptyState from '../components/EmptyState.vue'
import MoneyInput from '../components/MoneyInput.vue'
import PageHeader from '../components/PageHeader.vue'
import ServiceForm from '../components/ServiceForm.vue'
import { debtorsRepo, servicesRepo, settingsRepo } from '../data/repos'
import { accountName } from '../domain/accounts'
import { DEFAULT_SERVICES } from '../domain/defaultServices'
import type { Debtor, Service, Settings } from '../domain/types'
import { DEBTOR_TYPE_LABEL, VAT_LABEL } from '../labels'
import { attempt } from '../stores/toast'
import { today, usePracticeStore } from '../stores/practice'

const practice = usePracticeStore()

const blank = (): Settings => ({
  name: '', address: '', enterpriseNumber: '', vatNumber: '', rizivNumber: '', visumNumber: '', iban: '',
  vatProfile: 'exempt', openingBalanceCents: 0, openingBalanceDate: `${today().slice(0, 4)}-01-01`,
})
const form = reactive<Settings>({ ...blank(), ...practice.settings })
watch(() => practice.settings, (s) => s && Object.assign(form, s))

const isNew = ref(!practice.settings)
watch(() => practice.settings, (s) => { if (s) isNew.value = false })

function saveSettings() {
  attempt(() => settingsRepo.save({ ...form }), 'Opslaan mislukt', 'Praktijkgegevens opgeslagen')
}


const editingService = ref<Service | 'new' | null>(null)
function saveService(data: Omit<Service, 'id'>) {
  const current = editingService.value
  editingService.value = null
  attempt(
    () => (current && current !== 'new' ? servicesRepo.update(current.id, data) : servicesRepo.add(data)),
    'Dienst opslaan mislukt',
    'Dienst opgeslagen',
  )
}
function addDefaults() {
  attempt(() => Promise.all(DEFAULT_SERVICES.map((s) => servicesRepo.add(s))), 'Toevoegen mislukt', 'Standaarddiensten toegevoegd. Vul de tarieven in.')
}

const editingDebtor = ref<Debtor | 'new' | null>(null)
function saveDebtor(data: Omit<Debtor, 'id'>) {
  const current = editingDebtor.value
  editingDebtor.value = null
  attempt(
    () => (current && current !== 'new' ? debtorsRepo.update(current.id, data) : debtorsRepo.add(data)),
    'Debiteur opslaan mislukt',
    'Debiteur opgeslagen',
  )
}
</script>

<template>
  <PageHeader title="Instellingen" :intro="isNew ? 'Welkom. Vul eerst je praktijkgegevens in; ze komen op elke factuur.' : undefined" />

  <section class="panel mb-8">
    <h2 class="mb-4">Praktijkgegevens</h2>
    <form class="grid gap-4 md:grid-cols-2" @submit.prevent="saveSettings">
      <div class="md:col-span-2">
        <label class="label" for="s-name">Praktijknaam</label>
        <input id="s-name" v-model="form.name" class="field" required />
      </div>
      <div class="md:col-span-2">
        <label class="label" for="s-address">Adres</label>
        <textarea id="s-address" v-model="form.address" class="field" rows="2" />
      </div>
      <div><label class="label" for="s-kbo">Ondernemingsnummer (KBO)</label><input id="s-kbo" v-model="form.enterpriseNumber" class="field" placeholder="0123.456.789" /></div>
      <div><label class="label" for="s-vat">Btw-nummer</label><input id="s-vat" v-model="form.vatNumber" class="field" placeholder="BE0123.456.789" /></div>
      <div><label class="label" for="s-riziv">RIZIV-nummer</label><input id="s-riziv" v-model="form.rizivNumber" class="field" /></div>
      <div><label class="label" for="s-visum">Visumnummer (FOD Volksgezondheid)</label><input id="s-visum" v-model="form.visumNumber" class="field" /></div>
      <div class="md:col-span-2"><label class="label" for="s-iban">IBAN</label><input id="s-iban" v-model="form.iban" class="field" placeholder="BE68 5390 0754 7034" /></div>

      <fieldset class="md:col-span-2">
        <legend class="label">Welke diensten lever je?</legend>
        <div class="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
          <label class="flex gap-2 rounded-md border border-line p-3 has-checked:border-sage has-checked:bg-sage-light/40">
            <input v-model="form.vatProfile" type="radio" value="exempt" />
            <span><b class="block font-medium">Alleen zorg (art. 44)</b>Vrijgestelde btw-plichtige: geen periodieke btw-aangifte. Btw op aankopen is een kost.</span>
          </label>
          <label class="flex gap-2 rounded-md border border-line p-3 has-checked:border-sage has-checked:bg-sage-light/40">
            <input v-model="form.vatProfile" type="radio" value="mixed" />
            <span><b class="block font-medium">Zorg en belaste diensten</b>Gemengde btw-plichtige: kwartaalaangifte over coaching, opleidingen of verslagen. Btw op aankopen deels aftrekbaar.</span>
          </label>
          <label class="flex gap-2 rounded-md border border-line p-3 has-checked:border-sage has-checked:bg-sage-light/40">
            <input v-model="form.vatProfile" type="radio" value="taxed" />
            <span><b class="block font-medium">Alleen belaste diensten</b>Bijvoorbeeld coaching of arbeidspsychologie. 21% btw, volledige aftrek.</span>
          </label>
          <label class="flex gap-2 rounded-md border border-line p-3 has-checked:border-sage has-checked:bg-sage-light/40">
            <input v-model="form.vatProfile" type="radio" value="small" />
            <span><b class="block font-medium">Kleine onderneming</b>Belaste omzet onder € 25.000: vrijstellingsregeling, geen btw aanrekenen en geen aftrek.</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label class="label" for="s-ob">Banksaldo bij start</label>
        <MoneyInput id="s-ob" v-model="form.openingBalanceCents" />
      </div>
      <div>
        <label class="label" for="s-obd">Op datum</label>
        <input id="s-obd" v-model="form.openingBalanceDate" class="field" type="date" required />
      </div>
      <div class="md:col-span-2">
        <button class="btn-primary">Praktijkgegevens opslaan</button>
      </div>
    </form>
  </section>

  <section class="mb-8">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2>Diensten</h2>
      <button class="btn-secondary" :disabled="!practice.settings" @click="editingService = 'new'">Dienst toevoegen</button>
    </div>
    <EmptyState v-if="!practice.services.length">
      <p class="mb-3">Nog geen diensten. Begin met de meest voorkomende diensten van een psychologenpraktijk.</p>
      <button class="btn-primary" :disabled="!practice.settings" @click="addDefaults">Standaarddiensten toevoegen</button>
    </EmptyState>
    <div v-else class="overflow-x-auto">
      <table class="table">
        <thead><tr><th>Dienst</th><th>Code</th><th>Btw</th><th>Omzetrekening</th><th class="text-right">Tarief</th><th /></tr></thead>
        <tbody>
          <tr v-for="s in practice.services" :key="s.id">
            <td>{{ s.name }}</td>
            <td class="text-ink-soft">{{ s.code || '—' }}</td>
            <td>
              <span v-if="s.vatCode" class="badge bg-mist">{{ VAT_LABEL[s.vatCode] }}</span>
              <span v-else class="badge bg-ochre-light text-ochre">Geen btw-code</span>
            </td>
            <td class="text-ink-soft">{{ accountName(s.revenueAccount) }}</td>
            <td class="text-right"><AmountText :cents="s.rateCents" /></td>
            <td class="text-right"><button class="btn-quiet" @click="editingService = s">Wijzigen</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2>Debiteuren</h2>
      <button class="btn-secondary" :disabled="!practice.settings" @click="editingDebtor = 'new'">Debiteur toevoegen</button>
    </div>
    <EmptyState v-if="!practice.debtors.length">Nog geen debiteuren. Ziekenfondsen worden automatisch aangemaakt bij het importeren van sessies.</EmptyState>
    <div v-else class="overflow-x-auto">
      <table class="table">
        <thead><tr><th>Naam / nummer</th><th>Soort</th><th>Herinneringen</th><th /></tr></thead>
        <tbody>
          <tr v-for="d in practice.debtors" :key="d.id">
            <td>{{ d.displayName }}</td>
            <td class="text-ink-soft">{{ DEBTOR_TYPE_LABEL[d.type] }}</td>
            <td class="text-ink-soft">{{ d.type === 'client' ? (d.remindersEnabled ? 'Aan' : 'Uit') : '—' }}</td>
            <td class="text-right"><button class="btn-quiet" @click="editingDebtor = d">Wijzigen</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <AppModal v-if="editingService" :title="editingService === 'new' ? 'Nieuwe dienst' : 'Dienst wijzigen'" @close="editingService = null">
    <ServiceForm :service="editingService === 'new' ? undefined : editingService" @save="saveService" @cancel="editingService = null" />
  </AppModal>
  <AppModal v-if="editingDebtor" :title="editingDebtor === 'new' ? 'Nieuwe debiteur' : 'Debiteur wijzigen'" @close="editingDebtor = null">
    <DebtorForm :debtor="editingDebtor === 'new' ? undefined : editingDebtor" @save="saveDebtor" @cancel="editingDebtor = null" />
  </AppModal>
</template>
