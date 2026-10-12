import type { Service } from './types'

/** Starter set; rates are left at 0 so the practice sets its own. */
export const DEFAULT_SERVICES: Omit<Service, 'id'>[] = [
  { name: 'Consult (zelfbetaler / niet-gecontracteerd)', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-zelfbetalers', isCare: true },
  { name: 'No-show / late afzegging', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-no-show', isCare: false },
  { name: 'Coaching / loopbaanbegeleiding', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-coaching', isCare: false },
  { name: 'Training of workshop', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-training', isCare: false },
  { name: 'Deskundigenrapport', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-rapportage', isCare: false },
  { name: 'Onderverhuur behandelkamer', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-onderverhuur', isCare: false },
]
