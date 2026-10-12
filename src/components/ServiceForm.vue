<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ACCOUNTS } from '../domain/accounts'
import type { Service, VatCode } from '../domain/types'
import MoneyInput from './MoneyInput.vue'

const props = defineProps<{ service?: Service }>()
const emit = defineEmits<{ save: [data: Omit<Service, 'id'>]; cancel: [] }>()

const form = reactive({
  name: props.service?.name ?? '',
  code: props.service?.code ?? '',
  rateCents: props.service?.rateCents ?? 0,
  vatCode: (props.service?.vatCode ?? '') as VatCode | '',
  hasNzaMax: props.service?.nzaMaxCents !== undefined,
  nzaMaxCents: props.service?.nzaMaxCents ?? 0,
  revenueAccount: props.service?.revenueAccount ?? 'omzet-zelfbetalers',
  isCare: props.service?.isCare ?? true,
})

const revenueAccounts = ACCOUNTS.filter((a) => a.group === 'revenue' && a.id !== 'nog-te-declareren')
const canSave = computed(() => form.name.trim() !== '' && form.vatCode !== '')

function save() {
  if (!canSave.value) return
  const data: Omit<Service, 'id'> = {
    name: form.name.trim(),
    code: form.code.trim(),
    rateCents: form.rateCents,
    vatCode: form.vatCode as VatCode,
    revenueAccount: form.revenueAccount,
    isCare: form.isCare,
  }
  if (form.hasNzaMax) data.nzaMaxCents = form.nzaMaxCents
  emit('save', data)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div>
      <label class="label" for="svc-name">Naam</label>
      <input id="svc-name" v-model="form.name" class="field" required />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="svc-code">Prestatiecode (optioneel)</label>
        <input id="svc-code" v-model="form.code" class="field" />
      </div>
      <div>
        <label class="label" for="svc-rate">Tarief</label>
        <MoneyInput id="svc-rate" v-model="form.rateCents" />
      </div>
    </div>

    <fieldset>
      <legend class="label">Btw</legend>
      <div class="space-y-2 text-sm">
        <label class="flex gap-2"><input v-model="form.vatCode" type="radio" value="exempt" /> <span><b class="font-medium">Vrijgesteld</b> — zorg door een BIG-geregistreerde professional, met een gezondheidsdoel</span></label>
        <label class="flex gap-2"><input v-model="form.vatCode" type="radio" value="standard21" /> <span><b class="font-medium">21%</b> — coaching, trainingen, rapporten: geen gezondheidsdoel</span></label>
        <label class="flex gap-2"><input v-model="form.vatCode" type="radio" value="outside" /> <span><b class="font-medium">Buiten btw</b> — subsidies en vergoedingen die geen omzet zijn</span></label>
      </div>
      <p v-if="form.vatCode === ''" class="mt-2 text-sm text-ochre">Kies een btw-code. Zonder btw-code kan de dienst niet op een factuur.</p>
    </fieldset>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="svc-account">Omzetrekening</label>
        <select id="svc-account" v-model="form.revenueAccount" class="field">
          <option v-for="a in revenueAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <label class="flex items-center gap-2 pt-6 text-sm"><input v-model="form.isCare" type="checkbox" /> Telt als zorgomzet</label>
    </div>

    <div>
      <label class="flex items-center gap-2 text-sm"><input v-model="form.hasNzaMax" type="checkbox" /> Er geldt een NZa-maximumtarief</label>
      <div v-if="form.hasNzaMax" class="mt-2 max-w-48">
        <MoneyInput id="svc-nza" v-model="form.nzaMaxCents" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="btn-secondary" @click="emit('cancel')">Annuleren</button>
      <button class="btn-primary" :disabled="!canSave">Dienst opslaan</button>
    </div>
  </form>
</template>
