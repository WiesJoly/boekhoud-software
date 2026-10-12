import type { Service } from './types'

/** Starter set for a Belgian practice; rates are left at 0 so the practice sets its own. */
export const DEFAULT_SERVICES: Omit<Service, 'id'>[] = [
  { name: 'Sessie eerstelijnspsychologische zorg (conventie)', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-riziv', isCare: true },
  { name: 'Psychotherapie / individuele sessie (privé)', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-zelfbetalers', isCare: true },
  { name: 'Annuleringsvergoeding', code: '', rateCents: 0, vatCode: 'outside', revenueAccount: 'omzet-annulering', isCare: false },
  { name: 'Coaching / loopbaanbegeleiding', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-coaching', isCare: false },
  { name: 'Training of workshop', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-training', isCare: false },
  { name: 'Deskundigenverslag', code: '', rateCents: 0, vatCode: 'standard21', revenueAccount: 'omzet-verslagen', isCare: false },
  { name: 'Onderverhuur praktijkruimte', code: '', rateCents: 0, vatCode: 'exempt', revenueAccount: 'omzet-onderverhuur', isCare: false },
]
