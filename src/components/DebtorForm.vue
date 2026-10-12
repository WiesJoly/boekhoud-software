<script setup lang="ts">
import { reactive } from 'vue'
import type { Debtor, DebtorType } from '../domain/types'

const props = defineProps<{ debtor?: Debtor; type?: DebtorType }>()
const emit = defineEmits<{ save: [data: Omit<Debtor, 'id'>]; cancel: [] }>()

const form = reactive<Omit<Debtor, 'id'>>({
  type: props.debtor?.type ?? props.type ?? 'client',
  displayName: props.debtor?.displayName ?? '',
  invoiceName: props.debtor?.invoiceName ?? '',
  address: props.debtor?.address ?? '',
  email: props.debtor?.email ?? '',
  vatNumber: props.debtor?.vatNumber ?? '',
  remindersEnabled: props.debtor?.remindersEnabled ?? true,
})

const TYPES: { value: DebtorType; label: string }[] = [
  { value: 'client', label: 'Cliënt' },
  { value: 'organisation', label: 'Organisatie' },
  { value: 'mutuality', label: 'Ziekenfonds' },
  { value: 'network', label: 'Netwerk of overheid' },
]

function save() {
  const data = { ...form, displayName: form.displayName.trim(), invoiceName: form.invoiceName.trim() || form.displayName.trim() }
  emit('save', data)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div>
      <label class="label" for="deb-type">Soort</label>
      <select id="deb-type" v-model="form.type" class="field">
        <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <template v-if="form.type === 'client'">
      <div>
        <label class="label" for="deb-display">Cliëntnummer</label>
        <input id="deb-display" v-model="form.displayName" class="field" placeholder="bijv. C-0042" required />
        <p class="mt-1 text-sm text-ink-soft">Overal in de boekhouding zie je alleen dit nummer.</p>
      </div>
      <div>
        <label class="label" for="deb-name">Naam op de factuur</label>
        <input id="deb-name" v-model="form.invoiceName" class="field" required />
        <p class="mt-1 text-sm text-ink-soft">Komt alleen op de factuur zelf, niet in overzichten of exports.</p>
      </div>
    </template>
    <div v-else>
      <label class="label" for="deb-display">Naam</label>
      <input id="deb-display" v-model="form.displayName" class="field" required />
    </div>

    <div>
      <label class="label" for="deb-address">Adres</label>
      <textarea id="deb-address" v-model="form.address" class="field" rows="2" />
    </div>
    <div>
      <label class="label" for="deb-email">E-mail</label>
      <input id="deb-email" v-model="form.email" class="field" type="email" />
    </div>
    <div v-if="form.type === 'organisation'">
      <label class="label" for="deb-vat">Btw-nummer</label>
      <input id="deb-vat" v-model="form.vatNumber" class="field" placeholder="BE0123.456.789" />
      <p class="mt-1 text-sm text-ink-soft">Nodig voor e-facturen via Peppol aan ondernemingen.</p>
    </div>
    <label v-if="form.type === 'client'" class="flex items-center gap-2 text-sm">
      <input v-model="form.remindersEnabled" type="checkbox" /> Herinneringen tonen na 14 en 28 dagen
    </label>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="btn-secondary" @click="emit('cancel')">Annuleren</button>
      <button class="btn-primary">Debiteur opslaan</button>
    </div>
  </form>
</template>
